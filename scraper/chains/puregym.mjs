// Kæde-parser for PureGym (puregym.dk, Drupal). Omdanner sidernes rå svar til normaliserede
// Centre og Tilbud i Matchnings form (se data/matchning.js).
//
// Kilder:
//   /find-center                     alle Centre i ét kald: hvert div.map__teaser har et
//                                    data-attribut med JSON (koordinater, facilitets-id'er) og
//                                    et link til tilmeldingen /bliv-medlem/<node>/medlemskab
//   /priser                          prislisten: Oprettelsesgebyr og gebyr ved kortbetaling
//   /bliv-medlem/<node>/medlemskab   Drupal-formularen, hvor man vælger Aldersgruppe. Priserne
//                                    kommer først, når formularen sendes (Drupal ajax), så der
//                                    sendes én POST for "Under 30 år" og én for "30 år eller
//                                    over"
//
// Det giver 3 kald pr. Center plus 2 i alt, dvs. ca. 386 kald og ca. 20 minutter pr. nat med
// 2,5 sekunders pause.
//
// Formularens navn er versioneret (fx buy_membership_v2_2_step_choose_membership_vp), så navn,
// skjulte felter, knapper og adresse læses fra siden hver gang i stedet for at stå i koden.
//
// JSON-LD på centersiderne har de samme adresser og koordinater som /find-center, men ingen
// priser. Den bruges kun af stikprøven (puregymVerification.mjs), så natten ikke koster et
// ekstra kald pr. Center.

import { parseDanishNumber, wholeMonthsUntil } from './sats.mjs';

export const PUREGYM_BASE_URL = 'https://www.puregym.dk';
export const PUREGYM_CENTER_LIST_URL = `${PUREGYM_BASE_URL}/find-center`;
export const PUREGYM_PRICE_LIST_URL = `${PUREGYM_BASE_URL}/priser`;

// Rabatter, der ikke står i formularen. Ældre Sagen-satsen afhænger af medlemskabet og giver
// altid gratis oprettelse; Core-rabatten gælder også "Core og Hold" (samme rabatkode).
// https://www.aeldresagen.dk/tilbud-og-rabatter/samarbejdspartnere/motion-og-fitness/puregym/offers/puregym-fitnesstilbud
// Studierabatten gælder kun Unlimited, i 12 måneder og med oprettelse til 0 kr.
// https://www.puregym.dk/studierabat
export const PUREGYM_CHAIN = {
  id: 'puregym',
  name: 'PureGym',
  website: PUREGYM_BASE_URL,
  discounts: [
    {
      discountGroup: 'aeldreSagen',
      percentOff: 15,
      offerNames: ['Core', 'Core og Hold'],
      signupFee: 0,
    },
    { discountGroup: 'aeldreSagen', percentOff: 20, offerNames: ['Plus'], signupFee: 0 },
    { discountGroup: 'aeldreSagen', percentOff: 25, offerNames: ['Unlimited'], signupFee: 0 },
    {
      discountGroup: 'student',
      percentOff: 40,
      months: 12,
      offerNames: ['Unlimited'],
      signupFee: 0,
    },
  ],
};

// Facilitets-id'er fra filteret på /find-center. Et id, der står på Centret, betyder ja. Et id,
// der mangler, er ukendt ("Ikke oplyst"), så feltet udelades i stedet for at blive sat til false.
const FACILITY_IDS = { sauna: '502', groupClasses: '14', open24h: '665' };

export const AGE_GROUPS = ['under30', 'over30'];

// ---------- Fælles hjælpere ----------

const NAMED_ENTITIES = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  aelig: 'æ', oslash: 'ø', aring: 'å', AElig: 'Æ', Oslash: 'Ø', Aring: 'Å',
  eacute: 'é', ndash: '–', mdash: '—',
};

export function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (entity, name) => NAMED_ENTITIES[name] ?? entity);
}

// HTML → ren tekst på én linje.
export const textOf = (html) =>
  decodeEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();

const attribute = (tag, name) =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const centerIdFor = (teaserId) => `puregym-${teaserId}`;

// "UNLIMITED" → "Unlimited"; "Core og Hold" bevares. Så passer navnet med Rabatternes
// offerNames.
export function offerNameFrom(name) {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed.charAt(0) + trimmed.slice(1).toLowerCase();
}

// "Træn i dit stamcenter" → ét Center; "Træn i 57 centre" → flere Centre. Ukendt tekst giver
// ingen Abonnementstype og fejler derfor sanity-reglerne i stedet for at blive gættet.
export function subscriptionTypeFrom(variant) {
  if (/stamcenter/i.test(variant ?? '')) return 'Lokal center';
  const count = Number(variant?.match(/(\d+) centre/i)?.[1]);
  if (count > 1) return 'Landsdækkende';
  return undefined;
}

// ---------- Centerliste (/find-center) ----------

const TEASER_PATTERN =
  /<div class="map__teaser" data="([^"]*)">([\s\S]*?)(?=<div class="map__teaser" data=|$)/g;

export function parseCenterList(html) {
  const teasers = [...html.matchAll(TEASER_PATTERN)];
  if (teasers.length === 0 && !html.includes('map__results')) {
    throw new Error('Siden har ingen centerliste (map__results)');
  }

  return teasers.map(([, rawData, body]) => {
    const data = JSON.parse(decodeEntities(rawData));
    const addressHtml = body.match(/<p class="map__teaser__address">([\s\S]*?)<\/p>/)?.[1];
    const [street, postalArea] = addressHtml ? textOf(addressHtml).split('\n') : [];
    const nodeId = body.match(/href="\/bliv-medlem\/(\d+)\/medlemskab"/)?.[1];
    const pagePath = body.match(/href="([^"]+)" class="map__teaser__button"/)?.[1];

    // Titlen er "<gade>, <centernavn>", fx "Århusgade 102, Kbh Ø., Århusgade".
    const title = data.title?.trim();
    const centerName =
      title && street && title.startsWith(`${street}, `) ? title.slice(street.length + 2) : title;

    const facilities = {};
    const facilityIds = (data.facilities ?? []).map(String);
    for (const [facility, id] of Object.entries(FACILITY_IDS)) {
      if (facilityIds.includes(id)) facilities[facility] = true;
    }

    const { latitude, longitude } = data;
    return {
      nodeId,
      centerName,
      pageUrl: pagePath ? new URL(pagePath, PUREGYM_BASE_URL).href : undefined,
      teaserPrices: {
        from: parseDanishNumber(body.match(/class="map__teaser__price"[^>]*>([^<]*)</)?.[1]),
        standardFrom: parseDanishNumber(
          body.match(/class="map__teaser__price__note">([^<]*)</)?.[1],
        ),
      },
      id: centerIdFor(data.id),
      chainId: PUREGYM_CHAIN.id,
      name: centerName ? `PureGym ${centerName}` : undefined,
      address: street && postalArea ? `${street}, ${postalArea}` : undefined,
      location:
        typeof latitude === 'number' && typeof longitude === 'number'
          ? { latitude, longitude }
          : undefined,
      facilities,
      signupUrl: nodeId ? `${PUREGYM_BASE_URL}/bliv-medlem/${nodeId}/medlemskab` : undefined,
    };
  });
}

// ---------- Prisliste (/priser) ----------

// Oprettelsesgebyr og Admingebyr. PureGym tager 10 kr/md ved Betalingsservice og 0 kr ved
// kortbetaling; GymFinder regner med kort, så brugeren får den billigste mulighed.
export function parsePriceList(html) {
  const rows = [...html.matchAll(/<tr[^>]*>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g)].map(
    ([, label, value]) => ({ label: textOf(label), value: parseDanishNumber(textOf(value)) }),
  );
  if (rows.length === 0) throw new Error('Prislisten har ingen rækker');

  const signupRow = rows.find((row) => /^oprettelse$/i.test(row.label));
  const cardRow = rows.find((row) => /kreditkort/i.test(row.label));
  return {
    signupFee: signupRow?.value ?? undefined,
    adminFee: cardRow?.value ?? undefined,
  };
}

// ---------- Tilmeldingsformularen (/bliv-medlem/<node>/medlemskab) ----------

// Formularen inde i #membership-form-wrapper (siden har også en søgeformular med sit eget
// form_build_id). Alle skjulte felter sendes med, ligesom en browser gør.
export function parseMembershipForm(html, pageUrl) {
  const wrapperAt = html.indexOf('id="membership-form-wrapper"');
  if (wrapperAt === -1) throw new Error('Siden har ingen medlemskabsformular');
  const formStart = html.indexOf('<form', wrapperAt);
  const formEnd = html.indexOf('</form>', formStart);
  if (formStart === -1 || formEnd === -1) throw new Error('Siden har ingen medlemskabsformular');
  const formTag = html.slice(formStart, html.indexOf('>', formStart) + 1);
  const form = html.slice(formStart, formEnd);

  const fields = {};
  const buttons = {};
  for (const [input] of form.matchAll(/<input\b[^>]*>/g)) {
    const type = attribute(input, 'type');
    const name = attribute(input, 'name');
    const value = decodeEntities(attribute(input, 'value') ?? '');
    if (!name) continue;
    if (type === 'hidden') fields[name] = value;
    if (type === 'submit' && /^under_30/.test(name)) buttons.under30 = { name, value };
    if (type === 'submit' && /^over_30/.test(name)) buttons.over30 = { name, value };
  }

  if (!fields.form_id || !fields.form_build_id) {
    throw new Error('Medlemskabsformularen mangler form_id eller form_build_id');
  }
  for (const ageGroup of AGE_GROUPS) {
    if (!buttons[ageGroup]) throw new Error(`Medlemskabsformularen har ingen knap for ${ageGroup}`);
  }

  const action = new URL(decodeEntities(attribute(formTag, 'action') ?? ''), pageUrl);
  action.searchParams.set('ajax_form', '1');
  action.searchParams.set('_wrapper_format', 'drupal_ajax');

  return { formId: fields.form_id, fields, buttons, ajaxUrl: action.href };
}

// Felterne, der sendes for én Aldersgruppe.
export const formFieldsFor = (form, ageGroup) => ({
  ...form.fields,
  _triggering_element_name: form.buttons[ageGroup].name,
  _triggering_element_value: form.buttons[ageGroup].value,
});

// ---------- Drupal ajax-svaret (én Aldersgruppe) ----------

// Det med småt under hvert medlemskab, fx:
//   "INTROPRIS: Spar 25% frem til 30. november 2026 … Træn for 321,75/md. frem til 30-11-2026
//    … Normalpris for medlemskabet er 429,-/md. og opsigelsesperioden er løbende måned
//    + 1 måned."
//   "Prisen for medlemskabet er 349,-/md. … Opsigelse er løbende måned + 1 måned."
export function parseLegalText(html) {
  const text = textOf(html).replace(/\s+/g, ' ');
  const normal = text.match(
    /(?:Normalpris for medlemskabet er|Prisen for medlemskabet er) ([\d.,]+),-/,
  );
  const end = text.match(/frem til (\d{2})-(\d{2})-(\d{4})/);
  const headline = html.match(/<strong>([\s\S]*?)<\/strong>/)?.[1];
  const legal = {};
  if (normal) legal.normalPrice = parseDanishNumber(normal[1]);
  if (end) legal.campaignEndDate = `${end[3]}-${end[2]}-${end[1]}`;
  if (headline) legal.campaignText = textOf(headline);
  // Ingen Binding: opsigelse med løbende måned + 1 måned.
  if (/løbende måned \+ (?:1|én|en) måned/i.test(text)) legal.bindingMonths = 0;
  return legal;
}

// Ét ajax-svar (en JSON-liste af Drupal-kommandoer) → Centrets navn, formularens adresse og
// medlemskaberne med pris. Priserne tages fra settings-kommandoen (aktuel pris, dvs.
// kampagnepris hvis der er en) og fra det med småt (normalpris og kampagnens slutdato).
export function parseAjaxResponse(text) {
  // Drupals reserveformat: JSON'en pakket ind i <textarea>. Drupal koder "<" i JSON'en som
  // \u003C, så indholdet kan ikke selv lukke textarea'en.
  const wrapped = text.trim().match(/^<textarea>([\s\S]*)<\/textarea>$/);
  let commands;
  try {
    commands = JSON.parse(wrapped ? wrapped[1] : text);
  } catch {
    throw new Error('Svaret fra formularen er ikke JSON');
  }
  if (!Array.isArray(commands)) throw new Error('Svaret fra formularen er ikke en kommandoliste');

  const settings = commands.find((command) => command.command === 'settings')?.settings;
  const membershipSettings = settings?.fw_membership_v2;
  if (!membershipSettings?.membership) throw new Error('Svaret har ingen medlemskaber');

  const wrapper = commands.find(
    (command) => command.command === 'insert' && command.selector === '#membership-form-wrapper',
  )?.data;
  if (typeof wrapper !== 'string') throw new Error('Svaret har ingen medlemskabskort');

  const formAction = wrapper.match(/<form\b[^>]*\saction="([^"]*)"/)?.[1];
  // I den rækkefølge, siden viser kortene (settings er sorteret efter produkt-id).
  const products = Object.values(membershipSettings.membership)
    .flatMap((category) => Object.values(category ?? {}))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const memberships = products.map((product) => {
    const legalHtml = wrapper.match(
      new RegExp(`id="legal-text--${product.id}">([\\s\\S]*?)<\\/div>\\s*<\\/div>`),
    )?.[1];
    return {
      productId: String(product.id),
      name: offerNameFrom(product.name),
      variant: product.variant,
      currentPrice: typeof product.price === 'number' ? product.price : undefined,
      ...(legalHtml ? parseLegalText(legalHtml) : {}),
    };
  });

  return {
    centerName: membershipSettings.chosen_center_name,
    nodeId: formAction?.match(/\/bliv-medlem\/(\d+)\//)?.[1],
    memberships,
  };
}

// ---------- Samling til Tilbud ----------

// Kampagnen for ét medlemskab i én Aldersgruppe, eller null.
function campaignOf(membership) {
  const { currentPrice, normalPrice, campaignEndDate } = membership;
  if (currentPrice == null || normalPrice == null || !(currentPrice < normalPrice)) return null;
  return { price: currentPrice, endDate: campaignEndDate, text: membership.campaignText };
}

// Slår de to Aldersgruppers medlemskaber sammen til Tilbud for ét Center.
// fees = { signupFee, adminFee } fra prislisten. Resultat: { offers, warnings }.
//
// Kampagneprisen er forskellig for under 30 og 30+ (fx 25 % af hver sin Standardpris), men et
// Tilbud har kun én Kampagnepris. Den højeste af de to bruges, så Ærlig årspris hellere bliver
// lidt for høj end for lav. Kampagnen tages kun med, hvis begge Aldersgrupper har den med samme
// slutdato; ellers ville den ene Aldersgruppe få en pris, PureGym ikke tilbyder den.
export function buildOffers({ center, byAgeGroup, fees, today }) {
  const warnings = [];
  const byName = new Map();
  for (const ageGroup of AGE_GROUPS) {
    for (const membership of byAgeGroup[ageGroup].memberships) {
      const entry = byName.get(membership.name) ?? {};
      entry[ageGroup] = membership;
      byName.set(membership.name, entry);
    }
  }

  const offers = [];
  for (const [name, entry] of byName) {
    // Et Tilbud, der kun findes for den ene Aldersgruppe, kan ikke prissættes for alle brugere
    // og springes over med en advarsel (det er ikke en fejl i data).
    const missing = AGE_GROUPS.filter((ageGroup) => !entry[ageGroup]);
    if (missing.length > 0) {
      const only = missing.includes('under30') ? '30+' : 'under 30';
      warnings.push(`${center.id}: ${name} findes kun for ${only} og springes over`);
      continue;
    }

    const { under30, over30 } = entry;
    const standardPrice = {};
    for (const ageGroup of AGE_GROUPS) {
      const membership = entry[ageGroup];
      if (membership.normalPrice == null) {
        warnings.push(`${center.id}: normalprisen for ${name} (${ageGroup}) kunne ikke læses`);
      } else {
        standardPrice[ageGroup] = membership.normalPrice;
      }
    }

    let campaign = null;
    const campaigns = AGE_GROUPS.map((ageGroup) => campaignOf(entry[ageGroup]));
    if (campaigns.some(Boolean)) {
      const [young, old] = campaigns;
      if (!young || !old || young.endDate !== old.endDate || !young.endDate) {
        warnings.push(`${center.id}: kampagnen for ${name} er ikke ens for begge Aldersgrupper`);
      } else {
        const months = wholeMonthsUntil(today, young.endDate);
        if (months > 0) {
          campaign = {
            price: Math.max(young.price, old.price),
            months,
            endDate: young.endDate,
            text: old.text ?? young.text,
          };
        }
      }
    }

    offers.push({
      // Id ud fra navnet, fordi PureGyms produkt-id er forskelligt for de to Aldersgrupper.
      id: `${center.id}-${slugify(name)}`,
      name,
      subscriptionType: subscriptionTypeFrom(over30.variant ?? under30.variant),
      standardPrice,
      campaignPrice: campaign ? campaign.price : null,
      campaignMonths: campaign ? campaign.months : 0,
      ...(campaign && { campaignEndDate: campaign.endDate, campaignText: campaign.text }),
      signupFee: fees.signupFee,
      adminFee: fees.adminFee,
      bindingMonths: over30.bindingMonths ?? under30.bindingMonths,
      signupUrl: center.signupUrl,
    });
  }
  return { offers, warnings };
}

// ---------- Hentning ----------

// Samme Accept som Drupals eget jQuery-kald. Uden den svarer PureGym med kommandolisten pakket
// ind i <textarea> som text/html (Drupals reserveformat), hvilket parseAjaxResponse også kan læse.
const DRUPAL_AJAX_ACCEPT = 'application/json, text/javascript, */*; q=0.01';

// GET af formularen og én POST pr. Aldersgruppe. Resultat: { under30, over30 } som rå tekst.
// `http.getText(url)` og `http.postForm(url, fields, headers)` som i http.mjs.
export async function fetchCenterResponses({ http, center }) {
  if (!center.signupUrl) throw new Error('Centret har intet link til tilmeldingen');
  const form = parseMembershipForm(await http.getText(center.signupUrl), center.signupUrl);
  const responses = {};
  for (const ageGroup of AGE_GROUPS) {
    responses[ageGroup] = await http.postForm(form.ajaxUrl, formFieldsFor(form, ageGroup), {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: DRUPAL_AJAX_ACCEPT,
    });
  }
  return responses;
}

// Ét Center med Tilbud ud fra de to rå ajax-svar. Kaster, hvis svarene ikke kan læses eller
// hører til et andet Center. Resultat: { center, warnings }.
export function buildCenter({ listed, responses, fees, today }) {
  const byAgeGroup = {};
  for (const ageGroup of AGE_GROUPS) {
    const parsed = parseAjaxResponse(responses[ageGroup]);
    if (parsed.nodeId !== listed.nodeId) {
      throw new Error(
        `Svaret (${ageGroup}) er for /bliv-medlem/${parsed.nodeId}, ikke ${listed.nodeId}`,
      );
    }
    if (parsed.memberships.length === 0) throw new Error(`Svaret (${ageGroup}) har ingen Tilbud`);
    byAgeGroup[ageGroup] = parsed;
  }

  const warnings = [];
  const shownName = byAgeGroup.over30.centerName;
  if (shownName && listed.centerName && shownName !== listed.centerName) {
    warnings.push(
      `${listed.id}: formularen kalder Centret "${shownName}", listen "${listed.centerName}"`,
    );
  }

  const built = buildOffers({ center: listed, byAgeGroup, fees, today });
  warnings.push(...built.warnings);
  if (built.offers.length === 0) throw new Error('Ingen Tilbud findes for begge Aldersgrupper');

  const { nodeId, centerName, pageUrl, teaserPrices, ...centerData } = listed;
  return { center: { ...centerData, offers: built.offers }, warnings };
}

// Henter og parser hele PureGym.
// `limit` begrænser antallet af Centre (til live-tjek med få kald).
// Resultat: { chain, centers: [Center med offers], readErrors: [{ centerId, message }], warnings }.
// Kaster kun, hvis selve centerlisten ikke kan hentes eller læses.
export async function scrapePuregym({ http, today, limit } = {}) {
  const listed = parseCenterList(await http.getText(PUREGYM_CENTER_LIST_URL));
  const selected = limit ? listed.slice(0, limit) : listed;

  const warnings = [];
  let fees = {};
  try {
    fees = parsePriceList(await http.getText(PUREGYM_PRICE_LIST_URL));
    if (fees.signupFee == null) warnings.push('Oprettelsesgebyret står ikke i prislisten');
  } catch (error) {
    warnings.push(`Prislisten kunne ikke læses: ${error.message}`);
  }
  if (fees.adminFee == null) {
    warnings.push('Gebyret for kortbetaling står ikke i prislisten; Admingebyr regnes som 0');
    fees = { ...fees, adminFee: 0 };
  }

  const readErrors = [];
  const centers = [];
  for (const center of selected) {
    try {
      const responses = await fetchCenterResponses({ http, center });
      const built = buildCenter({ listed: center, responses, fees, today });
      warnings.push(...built.warnings);
      centers.push(built.center);
    } catch (error) {
      readErrors.push({ centerId: center.id, message: error.message });
    }
  }

  return { chain: PUREGYM_CHAIN, centers, readErrors, warnings };
}
