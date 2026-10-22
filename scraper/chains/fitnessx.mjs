// Kæde-parser for Fitness X (fitnessx.dk, WordPress). Omdanner sidernes rå HTML til normaliserede
// Centre og Tilbud i Matchnings form (se data/matchning.js).
//
// Kilder:
//   /find-center/       centerliste: div.center_map_list_item med navn, adresse, koordinater
//                       (attributterne lat og long), faciliteter, åbningstid, link til centersiden
//                       og Centrets GUID (DepartmentId i holdplan-linket)
//   /fitness/<…>/<…>/   centerside: inline `var sj_ajax_object = {…}` med ALLE Kædens ca. 104
//                       medlemskaber. medlemskabsdatalayer.location er sidens eget GUID, og et
//                       medlemskab hører til Centret, når dets acf.centre indeholder det GUID.
//   /oevrige-priser/    prislisten (gebyrsiden): Opstartsgebyr og Administrationsgebyr, og priser
//                       pr. Kategori til kontrol
//
// Hvert medlemskab findes i en under 30- og en 30+-udgave (acf.over_under_tredive) med samme
// medlemskabs_typeid; de to bliver ét Tilbud med Standardpris pr. Aldersgruppe.
// "Træningsven"-medlemskaber (to personer deler ét medlemskab) er Rabatgruppen Træn med en makker:
// prisen pr. person bliver Makkerpris på Tilbuddet med samme Kategori og samme Reformer-adgang.
//
// Kampagner står kun som fri tekst i acf.beskrivelse og læses defensivt (se parseCampaignText).
// acf.centre er håndvedligeholdt og indeholder skrald ("abc", "efg", tomme lister); kun GUID'er
// tæller, så skrald aldrig knytter et medlemskab til et Center.

import { wholeMonthsUntil } from './sats.mjs';

export const FITNESSX_BASE_URL = 'https://fitnessx.dk';
export const FITNESSX_CENTER_LIST_URL = `${FITNESSX_BASE_URL}/find-center/`;
export const FITNESSX_PRICE_LIST_URL = `${FITNESSX_BASE_URL}/oevrige-priser/`;
// Kædens fælles tilmeldingsside; bruges som tilmeldingslink for Centre uden egen centerside.
export const FITNESSX_SIGNUP_URL = `${FITNESSX_BASE_URL}/tilmelding/`;

// Fitness X har hverken studie-, senior- eller Ældre Sagen-rabat. Træn med en makker ligger som
// Makkerpris på det enkelte Tilbud (partnerPrice), ikke som Rabat på Kæden.
export const FITNESSX_CHAIN = {
  id: 'fitnessx',
  name: 'Fitness X',
  website: FITNESSX_BASE_URL,
  discounts: [],
};

// Ingen Binding: opsigelse med løbende måned + 1 måned (https://fitnessx.dk/medlemsbetingelser/).
const BINDING_MONTHS = 0;

// Engangsbeløb for at tilføje en Træningsven.
// Kilde: https://fitnessx.dk/split-regningen-med-din-traeningsven/
const PARTNER_FEE = 100;

const DANISH_MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
];

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Fælles hjælpere ----------

const decodeEntities = (text) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

// Beløb i kroner: "1050" → 1050, "1.200 kr." → 1200, "189,50" → 189.5, "60" → 60.
// Fitness X skriver beløb over 1.000 både med og uden punktum. Andet end et tal → null.
export function parseAmount(text) {
  if (text == null) return null;
  const match = String(text).match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?(?!\d)|\d+(?:,\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

// HTML → ren tekst på én linje.
export const plainText = (html) =>
  decodeEntities(String(html ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const centerIdFor = (name) => `fitnessx-${slugify(name)}`;

const isoDate = (year, monthIndex, day) =>
  new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);

// Finder JSON-objektet efter `marker` (fx 'var sj_ajax_object =') ved at tælle krøllede
// parenteser uden for strenge. Robust over for, hvad der står efter objektet i scriptet.
export function extractJsObject(html, marker) {
  const at = html.indexOf(marker);
  if (at === -1) return null;
  const start = html.indexOf('{', at);
  let depth = 0;
  let inString = false;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (char === '\\') i += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error(`${marker} slutter aldrig`);
}

// ---------- Centerliste ----------

const textOf = (block, className) => {
  const match = block.match(new RegExp(`class="${className}"[^>]*>([^<]*)<`));
  return match ? plainText(match[1]) || undefined : undefined;
};

const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

// Faciliteter fra checkmark-listen. Klassen "Ikke_inkluderet" betyder eksplicit nej; en facilitet,
// der slet ikke står der (fx sauna), er ukendt ("Ikke oplyst") og udelades.
// Åbningstiden står altid; kun et døgn (00–24) tæller som døgnåbent.
function facilitiesFrom(block) {
  const facilities = {};
  for (const [, className, label] of block.matchAll(
    /class="checkmark-text ([^"]*)">([^<]*)</g,
  )) {
    if (/hold/i.test(label)) facilities.groupClasses = className.trim() !== 'Ikke_inkluderet';
  }
  const hours = block.match(/id="openinghours" value="([^"]*)"/)?.[1]?.trim();
  if (hours) facilities.open24h = /^00[.:]00 ?- ?24[.:]00$|24\/7|døgnåbent/i.test(hours);
  return facilities;
}

export function parseCenterList(html) {
  const starts = [...html.matchAll(/<div class="center_map_list_item(?: [^"]*)?"[^>]*>/g)];
  if (starts.length === 0) throw new Error('Siden har ingen centerliste (center_map_list_item)');

  return starts.map((match, i) => {
    const block = html.slice(match.index, starts[i + 1]?.index ?? html.length);
    const tag = match[0];
    const name = block.match(/<h2[^>]*>([^<]*)<\/h2>/)?.[1];
    const street = textOf(block, 'adr_part1');
    const zip = textOf(block, 'adr_part2');
    const city = textOf(block, 'adr_part3');
    const latitude = Number.parseFloat(attribute(tag, 'lat'));
    const longitude = Number.parseFloat(attribute(tag, 'long'));
    const centerUrl = block.match(/<a href="([^"]+)" class="btn_center"/)?.[1];
    const guid = block.match(/class="btn_hold"/)
      ? block.match(/DepartmentId=([0-9a-f-]{36})/i)?.[1]?.toLowerCase()
      : undefined;
    const centerName = name ? plainText(name) : undefined;

    return {
      guid,
      id: centerName ? centerIdFor(centerName) : undefined,
      chainId: FITNESSX_CHAIN.id,
      name: centerName ? `Fitness X ${centerName}` : undefined,
      address: street && zip && city ? `${street}, ${zip} ${city}` : undefined,
      location:
        Number.isFinite(latitude) && Number.isFinite(longitude)
          ? { latitude, longitude }
          : undefined,
      facilities: facilitiesFrom(block),
      signupUrl: centerUrl ? new URL(centerUrl, FITNESSX_BASE_URL).href : undefined,
    };
  });
}

// ---------- Kampagner i fri tekst ----------

// Læser en kampagne i acf.beskrivelse. To formater ses på fitnessx.dk:
//   A: "Træn for kun 189 kr./md. frem til 31. december 2026. Herefter 360 kr./md."
//      Ét medlemskab pr. Aldersgruppe; acf.pris er Standardprisen efter kampagnen.
//   B: "Tilbuddet gælder resten af 2026. Herefter 360/400 kr./md. (over/under 30 år)."
//      Ét medlemskab for begge Aldersgrupper; acf.pris er Kampagneprisen, og Standardprisen
//      står i teksten. Rækkefølgen i parentesen passer ikke altid med tallene, så den laveste
//      pris regnes som under 30 (Fitness X er aldrig billigere for 30+).
// Resultat: { format, price?, endDate, after: { under30?, over30? } | number } eller null, hvis
// teksten ikke er en kampagne. Kaster, hvis teksten ligner en kampagne, men ikke kan læses.
export function parseCampaignText(description) {
  const text = plainText(description);
  // Kun tekst med en månedspris før "frem til", "Herefter <pris>" eller "resten af <år>" ligner
  // en kampagne. Fx "gratis reformerhold … frem til 1. marts 2027" ændrer ikke prisen.
  const looksLikeCampaign =
    /kr\.?\s*\/\s*md\.?[^.]*frem til|Herefter\s+\d|resten af \d{4}|kampagnepris/i;
  if (!looksLikeCampaign.test(text)) return null;

  const until = text.match(
    /(\d[\d.,]*)\s*kr\.?\s*\/\s*md\.?\s*frem til (?:og med )?(\d{1,2})\.\s*([a-zæøå]+)\s+(\d{4})/i,
  );
  const untilNumeric = text.match(
    /(\d[\d.,]*)\s*kr\.?\s*\/\s*md\.?\s*frem til (?:og med )?(\d{1,2})\.(\d{1,2})\.(\d{2,4})/i,
  );
  const afterSingle = text.match(/Herefter (\d[\d.,]*)\s*kr/i);
  const afterPair = text.match(/Herefter (\d[\d.,]*)\s*\/\s*(\d[\d.,]*)\s*kr/i);

  if (until || untilNumeric) {
    let endDate;
    if (until) {
      const monthIndex = DANISH_MONTHS.indexOf(until[3].toLowerCase());
      if (monthIndex === -1) throw new Error(`Ukendt måned i kampagnen: "${text}"`);
      endDate = isoDate(Number(until[4]), monthIndex, Number(until[2]));
    } else {
      const [, , day, month, rawYear] = untilNumeric;
      const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
      endDate = isoDate(year, Number(month) - 1, Number(day));
    }
    const price = parseAmount((until ?? untilNumeric)[1]);
    const after = afterSingle && !afterPair ? parseAmount(afterSingle[1]) : undefined;
    return { format: 'A', price, endDate, after };
  }

  const restOfYear = text.match(/resten af (\d{4})/i);
  if (restOfYear && afterPair) {
    const [low, high] = [parseAmount(afterPair[1]), parseAmount(afterPair[2])].sort(
      (a, b) => a - b,
    );
    return {
      format: 'B',
      endDate: isoDate(Number(restOfYear[1]), 11, 31),
      after: { under30: low, over30: high },
    };
  }

  throw new Error(`Kampagnen kunne ikke læses: "${text}"`);
}

// ---------- Centerside ----------

const AGE_GROUP = (overThirty) => (overThirty === true ? 'over30' : 'under30');

// "Kategori 2 &#8211; Under 30 (Aarhus) NYT" → "Kategori 2"; "Kategori 2 + Reformer U/30 NYT" →
// "Kategori 2 + Reformer"; "Åbningstilbud – Drop 3 – U/30 (Lindgreens Allé)" → "Åbningstilbud –
// Drop 3". Navnet er det, brugeren ser i appen, og grundlaget for Tilbuddets id.
export function offerNameFromTitle(title) {
  return plainText(title)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\bNYT\b/g, ' ')
    .replace(/\b(?:Under|Over)\s*30\b|\b[UO]\s*\/\s*30\b|\b[UO]30\b/gi, ' ')
    .replace(/\s+[–-]\s*(?=[–-]|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[\s\u2013-]+$/, '')
    .trim();
}

const categoryOf = (title) => Number(plainText(title).match(/Kategori (\d)/i)?.[1]) || null;
const hasReformer = (membership) => /reformer/i.test(plainText(membership.title));
const isPartnerMembership = (acf) => Number(acf.er_dette_et_traeningsvensmedlemskab) === 1;
// "SÆRPRIS I AARHUS": et særmedlemskab med færre Centre end resten af Kategorien.
const isSpecial = (acf) => /særpris/i.test(acf.label_tekst ?? '');

// Medlemskaber, hvis acf.centre indeholder Centrets GUID. Skrald i listen ignoreres.
export function membershipsForCenter(ajaxObject, guid) {
  const target = guid.toLowerCase();
  return (ajaxObject.medlemskaber ?? []).filter((membership) => {
    const centre = membership?.acf?.centre;
    if (!Array.isArray(centre)) return false;
    const isTarget = (value) =>
      typeof value === 'string' && GUID_PATTERN.test(value) && value.toLowerCase() === target;
    return centre.some(isTarget);
  });
}

export function extractAjaxObject(html) {
  const ajaxObject = extractJsObject(html, 'var sj_ajax_object =');
  if (!ajaxObject) throw new Error('Siden har ingen sj_ajax_object');
  if (!Array.isArray(ajaxObject.medlemskaber)) {
    throw new Error('sj_ajax_object har ingen medlemskaber');
  }
  return ajaxObject;
}

// Grupperer et Centers medlemskaber efter medlemskabs_typeid, så under 30- og 30+-udgaven
// samles. Medlemskaber uden Aldersgruppe (fx lukkede beboertilbud) springes over med en advarsel.
function groupByType(memberships, warnings) {
  const groups = new Map();
  for (const membership of memberships) {
    const { acf } = membership;
    if (typeof acf.over_under_tredive !== 'boolean') {
      warnings.push(`${plainText(membership.title)}: ingen Aldersgruppe, springes over`);
      continue;
    }
    const key = acf.medlemskabs_typeid || offerNameFromTitle(membership.title);
    const group = groups.get(key) ?? [];
    group.push(membership);
    groups.set(key, group);
  }
  return [...groups.values()];
}

// Læser én gruppe almindelige medlemskaber (ikke Træningsven) til et Tilbud. Kampagnetekst,
// der ikke kan læses, gør Tilbuddet ugyldigt i stedet for at give en forkert pris.
function offerFromGroup(group, warnings) {
  const first = group.find((membership) => membership.acf.over_under_tredive === false) ?? group[0];
  const name = offerNameFromTitle(first.title);
  const standardPrice = {};
  const campaignPrices = [];
  let campaign = null;

  for (const membership of group) {
    const { acf } = membership;
    const ageGroup = AGE_GROUP(acf.over_under_tredive);
    const parsed = parseCampaignText(acf.beskrivelse);
    const listedPrice = parseAmount(acf.pris);

    if (parsed?.format === 'B') {
      // Ét medlemskab dækker begge Aldersgrupper; acf.pris er Kampagneprisen.
      Object.assign(standardPrice, parsed.after);
      campaignPrices.push(listedPrice);
      campaign ??= { endDate: parsed.endDate, text: plainText(acf.beskrivelse) };
      continue;
    }

    if (standardPrice[ageGroup] != null && standardPrice[ageGroup] !== listedPrice) {
      warnings.push(
        `${name}: to priser for ${ageGroup} (${standardPrice[ageGroup]} og ${listedPrice}); ` +
          'den laveste bruges',
      );
      standardPrice[ageGroup] = Math.min(standardPrice[ageGroup], listedPrice);
    } else {
      standardPrice[ageGroup] = listedPrice;
    }

    if (parsed?.format === 'A') {
      if (parsed.after != null && parsed.after !== listedPrice) {
        warnings.push(
          `${name}: kampagneteksten siger "herefter ${parsed.after} kr", ` +
            `men prisen er ${listedPrice} kr`,
        );
      }
      campaignPrices.push(parsed.price);
      campaign ??= { endDate: parsed.endDate, text: plainText(acf.beskrivelse) };
    }
  }

  if (campaign) {
    // Matchning har én Kampagnepris pr. Tilbud; afviger de, bruges den højeste (aldrig for lav).
    campaign.price = Math.max(...campaignPrices);
    if (new Set(campaignPrices).size > 1) {
      warnings.push(`${name}: forskellige kampagnepriser (${campaignPrices.join(', ')})`);
    }
  }

  const centerCount = Number(first.acf.antal_centre);
  return {
    key: first.acf.medlemskabs_typeid || name,
    name,
    category: categoryOf(first.title),
    reformer: hasReformer(first),
    special: isSpecial(first.acf),
    centerCount: Number.isFinite(centerCount) && centerCount > 0 ? centerCount : undefined,
    standardPrice,
    campaign,
    signupFee: parseAmount(first.acf.opstartsgebyr) ?? undefined,
    adminFee: parseAmount(first.acf.administrationsgebyr) ?? undefined,
  };
}

// Træningsven-gruppe → samlet pris for to og pris pr. person pr. Aldersgruppe.
function partnerFromGroup(group) {
  const first = group[0];
  const total = {};
  const perPerson = {};
  for (const { acf } of group) {
    const ageGroup = AGE_GROUP(acf.over_under_tredive);
    total[ageGroup] = parseAmount(acf.pris);
    perPerson[ageGroup] = parseAmount(acf.pris_pr_person_i_tal) ?? total[ageGroup] / 2;
  }
  return {
    key: first.acf.medlemskabs_typeid,
    name: offerNameFromTitle(first.title),
    category: categoryOf(first.title),
    reformer: hasReformer(first),
    special: isSpecial(first.acf),
    centerCount: Number(first.acf.antal_centre) || undefined,
    total,
    perPerson,
    signupFee: parseAmount(first.acf.opstartsgebyr) ?? undefined,
    adminFee: parseAmount(first.acf.administrationsgebyr) ?? undefined,
  };
}

// Den billigste Træningsven-mulighed pr. person (30+, da Makkerpris er ét tal).
const cheapestPartner = (partners) => {
  const price = (partner) => partner.perPerson.over30 ?? Infinity;
  return [...partners].sort((a, b) => price(a) - price(b))[0];
};

// Læser Centrets Tilbud ud fra sj_ajax_object. `guid` er Centrets GUID (fra siden selv eller
// centerlisten). Resultat: { offers: [Tilbud-udkast], warnings }.
// Et Tilbud-udkast: { key, name, category, reformer, special, centerCount, standardPrice,
//   campaign: { price, endDate, text } | null, signupFee, adminFee, partner | null }.
// Træningsven-medlemskaber uden et almindeligt Tilbud at høre til (fx Hjørrings Kategori 5, som
// kun findes med Træningsven) bliver selvstændige Tilbud, hvor Standardprisen er prisen for to.
export function offersForCenter(ajaxObject, guid) {
  const warnings = [];
  const memberships = membershipsForCenter(ajaxObject, guid);
  const regular = memberships.filter((membership) => !isPartnerMembership(membership.acf));
  const partnerMemberships = memberships.filter((membership) =>
    isPartnerMembership(membership.acf),
  );

  const offers = [];
  for (const group of groupByType(regular, warnings)) {
    try {
      offers.push(offerFromGroup(group, warnings));
    } catch (error) {
      warnings.push(`${offerNameFromTitle(group[0].title)}: ${error.message}`);
    }
  }

  const partners = groupByType(partnerMemberships, warnings).map(partnerFromGroup);
  const used = new Set();
  for (const offer of offers) {
    const candidates = partners.filter(
      (partner) =>
        partner.category != null &&
        partner.category === offer.category &&
        partner.reformer === offer.reformer,
    );
    const partner = candidates.length > 0 ? cheapestPartner(candidates) : null;
    offer.partner = partner;
    for (const candidate of candidates) used.add(candidate);
  }

  for (const partner of partners.filter((candidate) => !used.has(candidate))) {
    offers.push({
      key: partner.key,
      name: partner.name,
      category: partner.category,
      reformer: partner.reformer,
      special: partner.special,
      centerCount: partner.centerCount,
      standardPrice: partner.total,
      campaign: null,
      signupFee: partner.signupFee,
      adminFee: partner.adminFee,
      partner,
    });
  }

  // To Tilbud med samme navn ville få samme id; det andet springes over.
  const seen = new Set();
  const unique = offers.filter((offer) => {
    if (seen.has(offer.name)) {
      warnings.push(`${offer.name}: findes to gange i Centret, det andet springes over`);
      return false;
    }
    seen.add(offer.name);
    return true;
  });

  return { offers: unique, warnings };
}

// Centersidens eget GUID og adresse fra den synlige adresselinje (gade, postnummer, by).
export function parseCenterPage(html) {
  const ajaxObject = extractAjaxObject(html);
  const guid = ajaxObject.medlemskabsdatalayer?.location?.toLowerCase();
  if (!guid || !GUID_PATTERN.test(guid)) throw new Error('Centersiden har intet center-GUID');
  return { guid, ajaxObject, address: parseVisibleAddress(html) };
}

// Adresselinjen øverst på centersiden: tre overskrifter med gade, postnummer og by.
export function parseVisibleAddress(html) {
  const headings = [
    ...html.matchAll(/class="elementor-heading-title[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|h\d)>/g),
  ].map((match) => plainText(match[1]));
  const zipIndex = headings.findIndex((heading) => /^\d{4}$/.test(heading));
  if (zipIndex < 1 || !headings[zipIndex + 1]) return undefined;
  return `${headings[zipIndex - 1]}, ${headings[zipIndex]} ${headings[zipIndex + 1]}`;
}

// ---------- Prisliste (gebyrsiden) ----------

// Prislisten består af Elementor-overskrifter: en etiket, der slutter med kolon, efterfulgt af
// prisen ("400 kr."). Sektionsoverskrifterne afgør Aldersgruppen og om det er Reformer- eller
// særmedlemskaber. Resultat: { signupFee, adminFee, entries: [{ label, price, ageGroup, reformer,
// partner, special, category }] }.
export function parsePriceList(html) {
  const headings = [
    ...html.matchAll(/class="elementor-heading-title[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|h\d|p)>/g),
  ].map((match) => plainText(match[1]));
  if (headings.length === 0) throw new Error('Prislisten har ingen overskrifter');

  const entries = [];
  const fees = {};
  let section = {};

  headings.forEach((heading, i) => {
    if (/^Medlemskaber under 30 år$/i.test(heading)) section = { ageGroup: 'under30' };
    else if (/^Medlemskaber over 30 år$/i.test(heading)) section = { ageGroup: 'over30' };
    else if (/^Reformer som medlemskab$/i.test(heading)) section = { reformer: true };
    else if (/^Reformer som tilkøb$/i.test(heading)) section = { done: true };
    else if (/^Særmedlemskaber$/i.test(heading)) section = { ...section, special: true };
    else if (/^Kategori \d - Adgang/i.test(heading)) section = { ...section, special: false };

    const price = headings[i + 1]?.match(/^(\d[\d.]*) kr\.?$/)?.[1];
    if (heading.endsWith(':') && price) {
      const label = heading.slice(0, -1).trim();
      const value = parseAmount(price);
      if (/^Administrationsgebyr$/i.test(label)) fees.adminFee = value;
      else if (/^Opstartsgebyr$/i.test(label)) fees.signupFee = value;
      else if (!section.done && (section.ageGroup || section.reformer)) {
        entries.push({
          label,
          price: value,
          ageGroup:
            section.ageGroup ??
            (/under 30/i.test(label) ? 'under30' : /over 30/i.test(label) ? 'over30' : undefined),
          reformer: Boolean(section.reformer) || /reformer/i.test(label),
          partner: /Træningsven/i.test(label),
          special: Boolean(section.special),
          category: Number(label.match(/Kategori (\d)/i)?.[1]) || null,
        });
      }
    }
  });

  return { ...fees, entries };
}

// Prislistens pris for et medlemskab, fx { category: 2, reformer: false, partner: true,
// special: false, ageGroup: 'under30' } → 560. Særmedlemskaber uden Kategori i etiketten (fx
// "Aarhus med Træningsven inkl. reformer") matcher alle Kategorier. undefined, hvis ikke på listen.
export function listPriceFor(priceList, { category, reformer, partner, special, ageGroup }) {
  const entry = priceList.entries.find(
    (candidate) =>
      candidate.ageGroup === ageGroup &&
      candidate.reformer === reformer &&
      candidate.partner === partner &&
      candidate.special === special &&
      (candidate.category === category || (special && candidate.category == null)),
  );
  return entry?.price;
}

// ---------- Samling til Kæde, Centre og Tilbud ----------

const subscriptionTypeFor = (centerCount) => {
  if (centerCount == null) return undefined;
  return centerCount > 1 ? 'Landsdækkende' : 'Lokal center';
};

function partnerRequirementFor(partner) {
  const { total, centerCount } = partner;
  const centers = centerCount === 1 ? 'ét Center' : `${centerCount} Centre`;
  const access = centerCount ? ` Medlemskabet giver jer begge adgang til ${centers}.` : '';
  return (
    `I deler ét medlemskab med Træningsven og betaler samlet ${total.under30} kr/md (under 30) ` +
    `eller ${total.over30} kr/md (30+). Det koster ${PARTNER_FEE} kr én gang at tilføje ` +
    `Træningsvennen.${access}`
  );
}

export function buildOffer(center, draft, { today, fees = {} }) {
  const months = draft.campaign ? wholeMonthsUntil(today, draft.campaign.endDate) : 0;
  const campaign = months > 0 ? draft.campaign : null;
  return {
    id: `${center.id}-${slugify(draft.name)}`,
    name: draft.name,
    subscriptionType: subscriptionTypeFor(draft.centerCount),
    standardPrice: draft.standardPrice,
    campaignPrice: campaign ? campaign.price : null,
    campaignMonths: campaign ? months : 0,
    ...(campaign && { campaignEndDate: campaign.endDate, campaignText: campaign.text }),
    signupFee: draft.signupFee ?? fees.signupFee,
    adminFee: draft.adminFee ?? fees.adminFee,
    bindingMonths: BINDING_MONTHS,
    // Makkerpris er ét tal i Matchning; 30+-prisen pr. person bruges, så den aldrig er for lav.
    partnerPrice: draft.partner ? draft.partner.perPerson.over30 : null,
    ...(draft.partner && { partnerRequirement: partnerRequirementFor(draft.partner) }),
    signupUrl: center.signupUrl,
  };
}

const FEE_LABELS = [
  ['signupFee', 'Oprettelsesgebyr'],
  ['adminFee', 'Admingebyr'],
];

// Henter og parser hele Fitness X. `http.getText(url)` leverer rå HTML (se http.mjs).
// `limit` begrænser antallet af Centre (til live-tjek med få kald).
// Resultat: { chain, centers: [Center med offers], readErrors: [{ centerId, message }], warnings }.
// Kaster kun, hvis selve centerlisten ikke kan hentes eller læses.
//
// Kald: centerlisten, prislisten og én centerside pr. Center med link. Et Center uden link til
// centersiden prissættes ud fra de andre centersider, da alle sider har hele Kædens medlemskaber;
// det kræver, at centerlisten har Centrets GUID. Dets tilmeldingslink er Kædens tilmeldingsside.
export async function scrapeFitnessx({ http, today, limit } = {}) {
  const listed = parseCenterList(await http.getText(FITNESSX_CENTER_LIST_URL));
  const selected = limit ? listed.slice(0, limit) : listed;

  const warnings = [];
  const readErrors = [];

  let fees = {};
  try {
    fees = parsePriceList(await http.getText(FITNESSX_PRICE_LIST_URL));
  } catch (error) {
    warnings.push(`Prislisten kunne ikke læses: ${error.message}`);
  }

  const pages = new Map();
  // Alle medlemskaber set på de hentede centersider (efter id), til Centre uden link.
  const allMemberships = new Map();
  for (const center of selected) {
    if (!center.signupUrl) continue;
    try {
      const page = parseCenterPage(await http.getText(center.signupUrl));
      if (center.guid && page.guid !== center.guid) {
        throw new Error(`Centersiden er for GUID ${page.guid}, ikke ${center.guid}`);
      }
      pages.set(center, page);
      for (const membership of page.ajaxObject.medlemskaber) {
        if (!allMemberships.has(membership?.id)) allMemberships.set(membership?.id, membership);
      }
    } catch (error) {
      readErrors.push({ centerId: center.id, message: error.message });
    }
  }

  const centers = [];
  for (const center of selected) {
    const failed = readErrors.some((readError) => readError.centerId === center.id);
    if (failed) continue;
    const page = pages.get(center);
    const guid = page?.guid ?? center.guid;
    const ajaxObject = page?.ajaxObject ?? { medlemskaber: [...allMemberships.values()] };

    if (!page) {
      const missing = !guid
        ? 'Centret har hverken link til centersiden eller GUID i centerlisten'
        : allMemberships.size === 0
          ? 'Centret har intet link til centersiden, og ingen anden centerside kunne læses'
          : null;
      if (missing) {
        readErrors.push({ centerId: center.id, message: missing });
        continue;
      }
    }

    const { offers, warnings: offerWarnings } = offersForCenter(ajaxObject, guid);
    warnings.push(...offerWarnings.map((warning) => `${center.name}: ${warning}`));
    if (offers.length === 0) {
      readErrors.push({ centerId: center.id, message: 'Centret har ingen Tilbud' });
      continue;
    }
    for (const draft of offers) {
      for (const [fee, label] of FEE_LABELS) {
        if (draft[fee] != null && fees[fee] != null && draft[fee] !== fees[fee]) {
          warnings.push(
            `${center.name} / ${draft.name}: ${label} ${draft[fee]} kr, ` +
              `prislisten siger ${fees[fee]} kr`,
          );
        }
      }
    }

    const { guid: _guid, ...centerData } = center;
    const output = { ...centerData, signupUrl: center.signupUrl ?? FITNESSX_SIGNUP_URL };
    centers.push({
      ...output,
      offers: offers.map((draft) => buildOffer(output, draft, { today, fees })),
    });
  }

  return { chain: FITNESSX_CHAIN, centers, readErrors, warnings };
}
