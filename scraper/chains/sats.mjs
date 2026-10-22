// Kæde-parser for SATS (sats.dk). Omdanner sidernes rå HTML til normaliserede Centre og Tilbud i
// Matchnings form (se data/matchning.js).
//
// Kilder (alle sider har præcis ét <script data-props="true" type="application/json">):
//   /traeningscenter               centerliste: props.clubs[] med adresse, koordinater og
//                                  faciliteter
//   /traeningscenter/<…>/<center>  centerside: props.becomeMemberSection.views[] med priser
//                                  pr. Aldersgruppe (under-30 / over-30) og medlemstype
//   /bliv-medlem-sats/tilpas-medlemskab?…
//                                  checkout: Oprettelsesgebyr, Binding og aktiv kampagne
//
// Gebyr og kampagne står kun på checkout-siden og er ens på tværs af Centre, så der hentes én
// checkout pr. medlemskab (Basic, Flexible, Premium) i det første Center, ikke én pr. Center.
// Checkout uden fødselsdato viser altid 30+-prisen, så selve priserne tages fra centersiden.

export const SATS_BASE_URL = 'https://www.sats.dk';
export const SATS_CENTER_LIST_URL = `${SATS_BASE_URL}/traeningscenter`;

export const SATS_CHAIN = {
  id: 'sats',
  name: 'SATS',
  website: SATS_BASE_URL,
};

// Ældre Sagen-rabatten står ikke på sats.dk, kun hos Ældre Sagen selv: 25 % på alle
// voksenabonnementer og altid gratis oprettelse.
// https://www.aeldresagen.dk/tilbud-og-rabatter/samarbejdspartnere/motion-og-fitness/sats/offers/rabat-paa-fitness-sats
const AELDRE_SAGEN_DISCOUNT = { discountGroup: 'aeldreSagen', percentOff: 25, signupFee: 0 };

const MEMBER_TYPE = {
  adult: 'MEMBERSHIP_MEMBER_TYPE_ADULT',
  student: 'MEMBERSHIP_MEMBER_TYPE_STUDENT',
  senior: 'MEMBERSHIP_MEMBER_TYPE_SENIOR',
};

const AGE_VIEWS = { 'under-30': 'under30', 'over-30': 'over30' };

// Abonnementstype ud fra medlemskabets id. Ukendte medlemskaber får ingen Abonnementstype og
// fejler derfor sanity-reglerne i stedet for at blive gættet.
const SUBSCRIPTION_TYPE_BY_PREFIX = [
  ['1CLUB_', 'Lokal center'],
  ['REGION_', 'Landsdækkende'],
  ['PREMIUM_', 'Landsdækkende'],
];

const DANISH_MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
];

// ---------- Fælles hjælpere ----------

const DATA_PROPS_PATTERN =
  /<script data-props="true" type="application\/json">([\s\S]*?)<\/script>/;

export function extractProps(html) {
  const match = html.match(DATA_PROPS_PATTERN);
  if (!match) throw new Error('Siden har ingen data-props');
  return JSON.parse(match[1]);
}

// "439,20" → 439.2, "4.193,00 kr." → 4193, "649 kr./md." → 649. Andet end et tal → null.
export function parseDanishNumber(text) {
  if (text == null) return null;
  const match = String(text).match(/-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

// Basic under 30 hedder "1CLUB_ALLDAY_NOBND_GX_U30" og over 30 "1CLUB_ALLDAY_NOBND_GX"; begge
// hører til samme Tilbud.
const baseMembershipId = (membershipId) => membershipId.replace(/_U30$/, '');

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const centerIdFor = (clubId) => `sats-${clubId}`;

function subscriptionTypeFor(membershipId) {
  const match = SUBSCRIPTION_TYPE_BY_PREFIX.find(([prefix]) => membershipId.startsWith(prefix));
  return match ? match[1] : undefined;
}

// Kun en facilitet, der står i listen, er sikker. Mangler nøglen, er den ukendt ("Ikke oplyst"),
// så feltet udelades i stedet for at blive sat til false.
function facilitiesFrom(filters = {}) {
  const facilities = {};
  if (filters['facility-sauna'] === true) facilities.sauna = true;
  if (filters['services-holdtraening'] === true) facilities.groupClasses = true;
  return facilities;
}

// ---------- Centerliste ----------

export function parseCenterList(html) {
  const { clubs } = extractProps(html);
  if (!Array.isArray(clubs)) throw new Error('Centerlisten har ingen clubs[]');

  return clubs.map((club) => {
    const street = club.address?.streetAddress?.trim();
    const area = club.address?.area?.trim();
    const { lat, lng } = club.location ?? {};
    return {
      clubId: String(club.id),
      id: centerIdFor(club.id),
      chainId: SATS_CHAIN.id,
      name: club.name ? `SATS ${club.name.trim()}` : undefined,
      address: street && area ? `${street}, ${area}` : undefined,
      location:
        typeof lat === 'number' && typeof lng === 'number'
          ? { latitude: lat, longitude: lng }
          : undefined,
      facilities: facilitiesFrom(club.filters),
      signupUrl: club.link?.href ? new URL(club.link.href, SATS_BASE_URL).href : undefined,
    };
  });
}

// ---------- Centerside ----------

// Centersidens adresse er mere fuldstændig end listens (fx "Fisketorvet Shopping Center,
// Kalvebod Brygge 59" mod kun "Fisketorvet Shopping Center"). Siden skriver "1304, København K";
// kommaet efter postnummeret fjernes, så formatet er det samme som i resten af appen.
const normalizePageAddress = (text) =>
  text?.trim().replace(/\s+/g, ' ').replace(/, (\d{4}),\s*/, ', $1 ') || undefined;

// Rabatprocent ud fra en færdigberegnet rabatpris, fx 439,20 af 549 → 20.
const percentOff = (discounted, full) => Math.round((1 - discounted / full) * 1000) / 10;

// Returnerer Centrets adresse, Tilbud (uden gebyr og kampagne, som kommer fra checkout) og de
// Rabatprocenter, siden viser for Studerende og Senior.
export function parseCenterPage(html) {
  const props = extractProps(html);
  const views = props.becomeMemberSection?.views;
  if (!Array.isArray(views)) throw new Error('Centersiden har ingen becomeMemberSection.views');

  const offersByKey = new Map();
  const discountPercents = { student: [], senior: [] };

  for (const view of views) {
    const ageGroup = AGE_VIEWS[view.id];
    if (!ageGroup) continue;
    const segments = view.segments ?? [];
    const adult = segments.find((segment) => segment.id === MEMBER_TYPE.adult);

    for (const membership of adult?.memberships ?? []) {
      const key = baseMembershipId(membership.id);
      const offer = offersByKey.get(key) ?? {
        key,
        name: membership.name?.trim(),
        subscriptionType: subscriptionTypeFor(key),
        standardPrice: {},
      };
      offer.standardPrice[ageGroup] = parseDanishNumber(membership.price);
      // Tilmeldingslinket for 30+ foretrækkes, fordi det er det SATS selv viser uden fødselsdato.
      if (ageGroup === 'over30' || !offer.signupUrl) offer.signupUrl = membership.link?.href;
      offersByKey.set(key, offer);
    }

    for (const group of ['student', 'senior']) {
      const segment = segments.find((candidate) => candidate.id === MEMBER_TYPE[group]);
      for (const membership of segment?.memberships ?? []) {
        const full = adult?.memberships?.find((candidate) => candidate.id === membership.id);
        const discounted = parseDanishNumber(membership.price);
        const fullPrice = parseDanishNumber(full?.price);
        if (discounted != null && fullPrice) {
          discountPercents[group].push(percentOff(discounted, fullPrice));
        }
      }
    }
  }

  return {
    clubId: props.clubId != null ? String(props.clubId) : undefined,
    address: normalizePageAddress(props.pageHeader?.addressLink?.text),
    offers: [...offersByKey.values()],
    discountPercents,
  };
}

// ---------- Checkout (tilpas-medlemskab) ----------

const toIsoDate = (date) => date.toISOString().slice(0, 10);

function utcDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

// Antal hele måneder fra i dag, hvor kampagneprisen gælder hele måneden. En påbegyndt måned
// tælles ikke med, så Ærlig årspris hellere bliver lidt for høj end for lav.
export function wholeMonthsUntil(today, endDate) {
  const start = utcDate(today);
  const end = utcDate(endDate);
  let months = 0;
  while (addMonths(start, months + 1) <= end) months += 1;
  return months;
}

// Kampagnens pris og slutdato. Vilkårsteksten har årstal ("Pris frem til 01.12.26 er 0 kr."),
// og bruges først; ellers overskriften ("Træn for 0 kr. til 1. december"), hvor året er det
// første, hvor datoen ikke er passeret.
export function parseCampaign({ headline, terms }, today) {
  const fromTerms = terms?.match(/Pris frem til (\d{1,2})\.(\d{1,2})\.(\d{2,4}) er (\d[\d.,]*) kr/);
  if (fromTerms) {
    const [, day, month, rawYear, price] = fromTerms;
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
    return {
      price: parseDanishNumber(price),
      endDate: toIsoDate(new Date(Date.UTC(year, Number(month) - 1, Number(day)))),
    };
  }

  const fromHeadline = headline?.match(/(\d[\d.,]*) kr\.? til (\d{1,2})\.\s*([a-zæøå]+)/i);
  if (fromHeadline) {
    const [, price, day, monthName] = fromHeadline;
    const monthIndex = DANISH_MONTHS.indexOf(monthName.toLowerCase());
    if (monthIndex === -1) return null;
    const todayDate = utcDate(today);
    let end = new Date(Date.UTC(todayDate.getUTCFullYear(), monthIndex, Number(day)));
    if (end < todayDate) {
      end = new Date(Date.UTC(todayDate.getUTCFullYear() + 1, monthIndex, Number(day)));
    }
    return { price: parseDanishNumber(price), endDate: toIsoDate(end) };
  }

  return null;
}

// Oprettelsesgebyr, Binding og kampagne fra checkout-siden. warnings beskriver ting, der ikke
// kunne læses, men som ikke gør Tilbuddet ugyldigt (fx en kampagnetekst i et nyt format).
export function parseCheckout(html, today) {
  const { layout, binding } = extractProps(html);
  const summary = layout?.checkoutSummary;
  if (!summary) throw new Error('Checkout-siden har ingen checkoutSummary');

  const warnings = [];
  const signupItem = summary.priceItems?.find((item) => /oprettelse/i.test(item.title ?? ''));
  const signupFee = parseDanishNumber(signupItem?.value);

  const selectedBinding = binding?.options?.options?.find((option) => option.isSelected);
  const paymentType = selectedBinding?.link?.match(/paymentTypeId=([A-Z]+)/)?.[1];
  const bindingMonths =
    paymentType === 'NOBND'
      ? 0
      : Number(selectedBinding?.title?.match(/(\d+) måneders binding/)?.[1]) || undefined;

  const headline = summary.activeCampaign?.value ?? layout.campaignDisclaimer?.campaign;
  let campaign = null;
  if (headline) {
    const parsed = parseCampaign({ headline, terms: layout.campaignDisclaimer?.disclaimer }, today);
    if (!parsed || parsed.price == null) {
      warnings.push(`Kampagnen kunne ikke læses: "${headline}"`);
    } else {
      const months = wholeMonthsUntil(today, parsed.endDate);
      if (months > 0) {
        campaign = { price: parsed.price, endDate: parsed.endDate, months, text: headline };
      }
    }
  }

  return {
    signupFee: signupFee ?? undefined,
    bindingMonths,
    campaign,
    monthlyPrice: parseDanishNumber(summary.totalPrice?.value),
    warnings,
  };
}

// Link til checkout for et medlemskab i et Center: altid uden binding (ordinært medlemskab).
export const checkoutUrlFor = ({ clubId, membershipKey }) =>
  `${SATS_BASE_URL}/bliv-medlem-sats/tilpas-medlemskab?memberTypeId=${MEMBER_TYPE.adult}` +
  `&clubId=${clubId}&membershipId=${membershipKey}`;

// ---------- Samling til Kæde, Centre og Tilbud ----------

// Den hyppigste værdi; bruges til Rabatprocenter, så ét afvigende Center ikke flytter Kæden.
function mostCommon(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function buildChain(discountPercents) {
  const discounts = [];
  for (const group of ['student', 'senior']) {
    const percent = mostCommon(discountPercents[group]);
    if (percent > 0) discounts.push({ discountGroup: group, percentOff: percent });
  }
  discounts.push(AELDRE_SAGEN_DISCOUNT);
  return { ...SATS_CHAIN, discounts };
}

function buildOffer(center, offer, terms) {
  return {
    // Id ud fra SATS' medlemskabs-id, så det er stabilt, selv hvis navnet ændres.
    id: `${center.id}-${slugify(offer.key)}`,
    name: offer.name,
    subscriptionType: offer.subscriptionType,
    standardPrice: offer.standardPrice,
    campaignPrice: terms?.campaign ? terms.campaign.price : null,
    campaignMonths: terms?.campaign ? terms.campaign.months : 0,
    campaignEndDate: terms?.campaign?.endDate,
    campaignText: terms?.campaign?.text,
    signupFee: terms?.signupFee,
    adminFee: 0,
    bindingMonths: terms?.bindingMonths,
    signupUrl: offer.signupUrl,
  };
}

// Henter og parser hele SATS. `http.getText(url)` leverer rå HTML (se http.mjs).
// `limit` begrænser antallet af Centre (til live-tjek med få kald).
// Resultat: { chain, centers: [Center med offers], readErrors: [{ centerId, message }], warnings }.
// Kaster kun, hvis selve centerlisten ikke kan hentes eller læses.
export async function scrapeSats({ http, today, limit } = {}) {
  const listed = parseCenterList(await http.getText(SATS_CENTER_LIST_URL));
  const selected = limit ? listed.slice(0, limit) : listed;

  const readErrors = [];
  const warnings = [];
  const pages = [];

  for (const center of selected) {
    try {
      if (!center.signupUrl) throw new Error('Centret har intet link til centersiden');
      const page = parseCenterPage(await http.getText(center.signupUrl));
      if (page.clubId !== center.clubId) {
        throw new Error(`Centersiden er for clubId ${page.clubId}, ikke ${center.clubId}`);
      }
      if (page.offers.length === 0) throw new Error('Centersiden har ingen Tilbud');
      pages.push({ center, page });
    } catch (error) {
      readErrors.push({ centerId: center.id, message: error.message });
    }
  }

  // Gebyr og kampagne pr. medlemskab, hentet i det første Center, der kunne læses.
  const termsByKey = new Map();
  const first = pages[0];
  for (const offer of first?.page.offers ?? []) {
    try {
      const url = checkoutUrlFor({ clubId: first.center.clubId, membershipKey: offer.key });
      const terms = parseCheckout(await http.getText(url), today);
      warnings.push(...terms.warnings.map((warning) => `${offer.name}: ${warning}`));
      // Checkout viser 30+-prisen; afviger den fra centersiden, er en af dem læst forkert.
      if (terms.monthlyPrice !== offer.standardPrice.over30) {
        warnings.push(
          `${offer.name}: checkout viser ${terms.monthlyPrice} kr/md, centersiden ` +
            `${offer.standardPrice.over30} kr/md`,
        );
      }
      termsByKey.set(offer.key, terms);
    } catch (error) {
      warnings.push(`Checkout for ${offer.name} kunne ikke læses: ${error.message}`);
    }
  }

  const discountPercents = { student: [], senior: [] };
  const centers = pages.map(({ center, page }) => {
    discountPercents.student.push(...page.discountPercents.student);
    discountPercents.senior.push(...page.discountPercents.senior);
    const { clubId, ...centerData } = center;
    return {
      ...centerData,
      address: page.address ?? center.address,
      offers: page.offers.map((offer) => buildOffer(center, offer, termsByKey.get(offer.key))),
    };
  });

  return { chain: buildChain(discountPercents), centers, readErrors, warnings };
}
