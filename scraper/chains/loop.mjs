// Kæde-parser for LOOP Fitness (loopfitness.dk). Omdanner sidernes rå HTML til normaliserede
// Centre og Tilbud i Matchnings form (se data/matchning.js).
//
// Kilder (to kald pr. nat i alt):
//   /centre/   centerlisten. Et inline <script> har `var locations = {…}` med alle Centre:
//              adresse, koordinater, åbningstider, holdtræning og public_groups[] (abonnementer
//              med pris, Admingebyr, Oprettelsesgebyr, kampagne og familiemedlemskab).
//   /priser/   rabatkortene (statisk HTML): Studerende og Ældre Sagen 15 % og det normale
//              Oprettelsesgebyr på 199 kr, som gælder, når man bruger en Rabat.
//
// LOOP opkræver pr. 30 dage, ikke pr. kalendermåned (ca. 12,17 betalinger om året). Det
// gemmes som billingIntervalDays: 30, så Ærlig årspris regnes med det rigtige antal betalinger.
// Alle priser, Admingebyr og Kampagneperioder herunder er derfor pr. 30 dage.

export const LOOP_BASE_URL = 'https://loopfitness.dk';
export const LOOP_CENTER_LIST_URL = `${LOOP_BASE_URL}/centre/`;
export const LOOP_PRICES_URL = `${LOOP_BASE_URL}/priser/`;
export const LOOP_SIGNUP_URL = `${LOOP_BASE_URL}/medlemskab/bliv-medlem`;

export const LOOP_CHAIN = {
  id: 'loop',
  name: 'LOOP Fitness',
  website: LOOP_BASE_URL,
};

// Kædens almindelige abonnement hedder "Voksen" på /priser/, men i data hedder det efter den
// aktuelle kampagne ("Kampagne: 100 kr. resten af året"). Det får navnet "Voksen", så Tilbuddets
// id er det samme, når kampagnen skifter.
const ADULT_OFFER_NAME = 'Voksen';
const CAMPAIGN_NAME_PATTERN = /^kampagne\b/i;

// Aftaler for foreninger, bosteder og skoler kan ikke købes af en almindelig bruger.
const EXCLUDED_NAME_PATTERN = /aftale/i;

// Rabatkortene på /priser/ → Rabatgrupper. Diabetes- og Hjerteforeningen er ikke Rabatgrupper i
// GymFinder og springes over.
const DISCOUNT_GROUP_PATTERNS = [
  ['student', /som studerende/i],
  ['aeldreSagen', /ældre sagen/i],
];

const DAYS_PER_PERIOD = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- Fælles hjælpere ----------

// æ, ø og å skrives om før NFKD, som ellers ville gøre å til a.
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

const centerIdFor = (loopId) => `loop-${loopId}`;

// "289.0" → 289, "" / null / "abc" → null.
function toNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const roundKr = (amount) => Math.round(amount * 100) / 100;

function utcDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export const decodeEntities = (text) =>
  text
    .replace(/&aring;/g, 'å')
    .replace(/&aelig;/g, 'æ')
    .replace(/&oslash;/g, 'ø')
    .replace(/&Aring;/g, 'Å')
    .replace(/&AElig;/g, 'Æ')
    .replace(/&Oslash;/g, 'Ø')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#0?38;|&amp;/g, '&')
    .replace(/&#x27;|&#0?39;/g, "'")
    .replace(/&quot;/g, '"');

// Læser JSON-objektet efter `marker` i et inline script. Objektet slutter ved den krølleparentes,
// der lukker den første; tegn inde i strenge tælles ikke med.
export function extractInlineObject(html, marker) {
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const open = html.indexOf('{', start + marker.length);
  if (open === -1) return null;

  let depth = 0;
  let inString = false;
  for (let i = open; i < html.length; i += 1) {
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
      if (depth === 0) return JSON.parse(html.slice(open, i + 1));
    }
  }
  throw new Error(`${marker.trim()} slutter ikke`);
}

// Tilmeldingslinket, som LOOPs egne priskort bruger (price-card.js): Centrets id og
// abonnementets navn som parametre.
export function signupUrlFor({ loopId, subscription }) {
  const url = new URL(LOOP_SIGNUP_URL);
  url.searchParams.set('center', String(loopId));
  if (subscription) url.searchParams.set('subscription', subscription);
  return url.href;
}

// ---------- Kampagne ----------

// Kampagnen på et abonnement (trial_period_1_*). To former findes:
// - Med slutdato (`trial_period_1_until`): én betaling dækker fra tilmelding til og med
//   slutdatoen, fx "100 kr. resten af året". Beløbet fordeles på de hele 30-dages-perioder,
//   der er tilbage. En påbegyndt periode tælles ikke med, så Ærlig årspris hellere bliver lidt
//   for høj end for lav. Er der under 30 dage tilbage, regnes kampagnen ikke med.
// - Uden slutdato: de første `trial_period_1_months` perioder koster kampagneprisen, fx
//   "20 kr. de første 30 dage".
// Er kampagneprisen ikke lavere end Standardprisen, er det ingen kampagne (LOOP sætter
// trial_period_1_price = price på almindelige abonnementer).
// Matchning lægger Admingebyret oven i hver periode, også i kampagnen. LOOPs første betaling er
// uden Admingebyr, så også her bliver prisen hellere lidt for høj end for lav.
// Resultat: { campaign: { price, months, endDate? } | null, warning? }. warning, hvis formen
// er ukendt; så regnes der hellere uden kampagne end med en gættet pris.
export function parseCampaign(group, today) {
  const standardPrice = toNumber(group.price);
  const trialPrice = toNumber(group.trial_period_1_price);
  const periods = toNumber(group.trial_period_1_months) ?? 0;
  const quantity = toNumber(group.trial_period_1_quantity) ?? DAYS_PER_PERIOD;
  const until = group.trial_period_1_until;

  if (trialPrice == null || standardPrice == null || trialPrice >= standardPrice) {
    return { campaign: null };
  }
  if (periods <= 0 && !until) return { campaign: null };

  if (until) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) {
      return { campaign: null, warning: `ukendt slutdato "${until}"` };
    }
    // Slutdatoen er med (man træner til og med den dag).
    const days = Math.round((utcDate(until) - utcDate(today)) / DAY_MS) + 1;
    const months = Math.floor(days / DAYS_PER_PERIOD);
    if (months <= 0) return { campaign: null };
    return { campaign: { price: roundKr(trialPrice / months), months, endDate: until } };
  }

  if (quantity !== DAYS_PER_PERIOD) {
    return { campaign: null, warning: `kampagneperiode på ${quantity} dage` };
  }
  return { campaign: { price: trialPrice, months: periods } };
}

// ---------- Centerliste med Tilbud ----------

// "Ballerup Centret " + "Banetoften 30" + "2750" + "Ballerup" → "Ballerup Centret, Banetoften 30,
// 2750 Ballerup".
function addressFrom(location) {
  const lines = [location.address_line_1, location.address_line_2]
    .map((line) => (typeof line === 'string' ? line.trim().replace(/\s+/g, ' ') : ''))
    .filter(Boolean);
  const area = [location.area_code, location.city]
    .map((part) => (part == null ? '' : String(part).trim()))
    .filter(Boolean)
    .join(' ');
  if (lines.length === 0 || !area) return undefined;
  return `${lines.join(', ')}, ${area}`;
}

function coordinatesFrom(location) {
  const latitude = toNumber(location.lat);
  const longitude = toNumber(location.lng);
  return latitude == null || longitude == null ? undefined : { latitude, longitude };
}

// Åbningstider pr. ugedag: [{ open: '05:00', close: '22:00' }, …] (mandag først) eller null, hvis
// en dag mangler.
export function openingHoursFrom(location) {
  const days = [];
  for (let day = 1; day <= 7; day += 1) {
    const open = location[`day${day}_open`];
    const close = location[`day${day}_close`];
    if (!/^\d{2}:\d{2}$/.test(open ?? '') || !/^\d{2}:\d{2}$/.test(close ?? '')) return null;
    days.push({ open, close });
  }
  return days;
}

// Døgnåbent kun, hvis alle dage går fra 00:00 til 23:59/24:00. LOOP oplyser åbningstiderne for
// alle Centre, så et Center med fx 05–22 er med sikkerhed ikke døgnåbent. Mangler tiderne, er
// det ukendt ("Ikke oplyst"). Sauna oplyser LOOP ikke, så den er altid ukendt.
function facilitiesFrom(location) {
  const facilities = {};
  if (typeof location.classes === 'boolean') facilities.groupClasses = location.classes;
  const hours = openingHoursFrom(location);
  if (hours) {
    facilities.open24h = hours.every(
      ({ open, close }) => open === '00:00' && (close === '23:59' || close === '24:00'),
    );
  }
  return facilities;
}

// Kun abonnementer, man kan melde sig ind i og betale løbende: ikke feriepas (instant),
// personale (free), aftaler for institutioner eller skjulte abonnementer.
function isSubscribable(group) {
  return (
    group?.payment_type === 'auto' &&
    (group.status == null || group.status === 'PUBLIC') &&
    (toNumber(group.days) ?? 0) >= DAYS_PER_PERIOD &&
    !EXCLUDED_NAME_PATTERN.test(group.name ?? '')
  );
}

const isFamily = (group) => (toNumber(group.family_members) ?? 0) > 0;

// Navnet uden "familie" og tegnsætning, så et familiemedlemskab kan parres med det
// almindelige abonnement: "kampagne: 100 kr resten af året - familie" ↔ "Kampagne: 100 kr.
// resten af året", "ALL IN FAMILY (DS, LOOP & HOLD)" ↔ "ALL IN (DS, LOOP & HOLD)".
const pairingKey = (name) =>
  name
    .toLowerCase()
    .replace(/\bfamil(ie|y)\b/g, ' ')
    .replace(/[^a-z0-9æøå]+/g, ' ')
    .trim();

function offerNameFor(group) {
  const name = (group.name ?? '').trim().replace(/\s+/g, ' ');
  return CAMPAIGN_NAME_PATTERN.test(name) ? ADULT_OFFER_NAME : name;
}

// Træn med en makker = LOOPs familiemedlemskab: to eller flere i samme husstand deler ét
// abonnement. Makkerprisen er prisen pr. person for to, inkl. husstandens ene Admingebyr:
// (589 + 10) / 2 = 299,50 kr pr. 30 dage. Matchning lægger Tilbuddets Admingebyr oven i
// Makkerprisen, så partnerPrice er pr. person uden det: 299,50 − 10 = 289,50.
// Familiens kampagne (fx 100 kr. for hele husstanden resten af året) regnes ikke med, fordi
// Makkerprisen i Matchning er den samme hele året.
function partnerFieldsFor(familyGroup) {
  const householdPrice = toNumber(familyGroup.price);
  const adminFee = toNumber(familyGroup.admin_fee) ?? 0;
  if (householdPrice == null) return {};
  return {
    partnerPrice: roundKr((householdPrice + adminFee) / 2 - adminFee),
    partnerRequirement:
      `I skal bo i samme husstand og deler ét familiemedlemskab til ${householdPrice} kr ` +
      `+ ${adminFee} kr i Admingebyr pr. 30 dage.`,
  };
}

function buildOffer({ center, loopId, group, family, today, warnings }) {
  const name = offerNameFor(group);
  const { campaign, warning } = parseCampaign(group, today);
  if (warning) warnings.push(`${center.name} / ${name}: kampagnen kunne ikke læses (${warning})`);
  if ((toNumber(group.trial_period_2_months) ?? 0) > 0) {
    warnings.push(`${center.name} / ${name}: andet kampagnetrin regnes ikke med`);
  }

  return {
    id: `${center.id}-${slugify(name)}`,
    name,
    subscriptionType: group.local_gym_only === true ? 'Lokal center' : 'Landsdækkende',
    standardPrice: toNumber(group.price) ?? undefined,
    campaignPrice: campaign ? campaign.price : null,
    campaignMonths: campaign ? campaign.months : 0,
    campaignEndDate: campaign?.endDate,
    campaignText: campaign ? group.name.trim().replace(/\s+/g, ' ') : undefined,
    signupFee: toNumber(group.signup_fee) ?? undefined,
    adminFee: toNumber(group.admin_fee) ?? undefined,
    // LOOP har ingen Binding; man kan opsige med løbende periode plus 30 dage.
    bindingMonths: 0,
    billingIntervalDays: toNumber(group.days) ?? undefined,
    ...(family ? partnerFieldsFor(family) : { partnerPrice: null }),
    signupUrl: signupUrlFor({ loopId, subscription: group.name.trim() }),
  };
}

// Centrets Tilbud: hvert almindeligt abonnement bliver ét Tilbud, og et familiemedlemskab
// lægges på det abonnement, det hører til, som Makkerpris.
function offersFor(center, loopId, groups, today, warnings) {
  const subscribable = groups.filter(isSubscribable);
  const families = subscribable.filter(isFamily);
  const singles = subscribable.filter((group) => !isFamily(group));

  const offers = [];
  const usedFamilies = new Set();
  for (const group of singles) {
    const family = families.find(
      (candidate) => pairingKey(candidate.name ?? '') === pairingKey(group.name ?? ''),
    );
    if (family) usedFamilies.add(family);
    const offer = buildOffer({ center, loopId, group, family, today, warnings });
    if (offers.some((existing) => existing.id === offer.id)) {
      warnings.push(`${center.name}: to abonnementer giver samme Tilbud "${offer.name}"`);
      continue;
    }
    offers.push(offer);
  }

  for (const family of families) {
    if (!usedFamilies.has(family)) {
      warnings.push(`${center.name}: familiemedlemskabet "${family.name.trim()}" har intet ` +
        'almindeligt abonnement at høre til og springes over');
    }
  }
  return offers;
}

// Læser hele centerlisten: { centers, readErrors, warnings }. `limit` tager kun de første
// Centre. Kaster, hvis siden ikke har `var locations`, så Kæden springes over.
export function parseCenterList(html, today, { limit } = {}) {
  const locations = extractInlineObject(html, 'var locations = ');
  if (!locations || typeof locations !== 'object') {
    throw new Error('Centerlisten har ingen var locations');
  }

  const centers = [];
  const readErrors = [];
  const warnings = [];

  const all = Object.values(locations);
  for (const location of limit ? all.slice(0, limit) : all) {
    if (location?.id == null) continue;
    const loopId = location.id;
    const center = {
      id: centerIdFor(loopId),
      chainId: LOOP_CHAIN.id,
      name: typeof location.name === 'string' ? location.name.trim() : undefined,
      address: addressFrom(location),
      location: coordinatesFrom(location),
      facilities: facilitiesFrom(location),
      signupUrl: location.url || signupUrlFor({ loopId }),
    };

    const groups = Array.isArray(location.public_groups) ? location.public_groups : [];
    const offers = offersFor(center, loopId, groups, today, warnings);
    if (offers.length === 0) {
      readErrors.push({ centerId: center.id, message: 'Centret har ingen abonnementer' });
      continue;
    }
    centers.push({ ...center, offers });
  }

  return { centers, readErrors, warnings };
}

// ---------- Rabatter (/priser/) ----------

const DISCOUNT_CARD = 'class="loop-price-card-discounts-price"';

const textOf = (html) =>
  decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

// Rabatkortene: [{ discountGroup, percentOff, signupFee, discountedPrice }]. discountedPrice er
// den viste pris efter Rabat (fx 245,65 = 289 × 0,85), som bruges til at tjekke procenten.
export function parsePricesPage(html) {
  const starts = [];
  for (let at = html.indexOf(DISCOUNT_CARD); at !== -1; at = html.indexOf(DISCOUNT_CARD, at + 1)) {
    starts.push(at);
  }

  const discounts = [];
  starts.forEach((start, i) => {
    const card = html.slice(start, starts[i + 1] ?? html.length);
    const text = textOf(card);
    const group = DISCOUNT_GROUP_PATTERNS.find(([, pattern]) => pattern.test(text));
    if (!group) return;
    const percentOff = Number(text.match(/(\d+(?:,\d+)?)\s*% rabat/i)?.[1]?.replace(',', '.'));
    const signupFee = Number(text.match(/Oprettelse (\d+) kr/i)?.[1]);
    const discountedPrice = Number(
      card.match(/full-price-value">([^<]+)</)?.[1]?.trim().replace(',', '.'),
    );
    discounts.push({
      discountGroup: group[0],
      percentOff: Number.isFinite(percentOff) ? percentOff : undefined,
      signupFee: Number.isFinite(signupFee) ? signupFee : undefined,
      discountedPrice: Number.isFinite(discountedPrice) ? discountedPrice : undefined,
    });
  });
  return discounts;
}

// ---------- Samling til Kæde, Centre og Tilbud ----------

// Den hyppigste værdi, så ét afvigende Center ikke flytter tjekket.
function mostCommon(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

// Kædens Rabatter. Rabatkortene regner procenten af Voksen-prisen, så Rabatterne gælder kun
// Tilbuddet Voksen; de gælder med det normale Oprettelsesgebyr (kampagnens gratis oprettelse
// følger ikke med en Rabat). Et kort, der ikke kan læses helt, kaster, så Kæden springes over
// i stedet for at miste Rabatten.
function buildChain(cards, centers, warnings) {
  const adultPrice = mostCommon(
    centers.flatMap((center) =>
      center.offers.filter((offer) => offer.name === ADULT_OFFER_NAME).map((o) => o.standardPrice),
    ),
  );

  const discounts = [];
  for (const discountGroup of DISCOUNT_GROUP_PATTERNS.map(([group]) => group)) {
    const card = cards.find((candidate) => candidate.discountGroup === discountGroup);
    if (!card) throw new Error(`Prissiden har intet rabatkort for ${discountGroup}`);
    if (card.percentOff == null || card.signupFee == null) {
      throw new Error(`Rabatkortet for ${discountGroup} kunne ikke læses`);
    }
    if (adultPrice != null && card.discountedPrice != null) {
      const expected = roundKr(adultPrice * (1 - card.percentOff / 100));
      if (Math.abs(expected - card.discountedPrice) > 0.01) {
        warnings.push(
          `Rabatkortet for ${discountGroup} viser ${card.discountedPrice} kr, men ` +
            `${card.percentOff} % af ${adultPrice} kr er ${expected} kr`,
        );
      }
    }
    discounts.push({
      discountGroup,
      percentOff: card.percentOff,
      offerNames: [ADULT_OFFER_NAME],
      signupFee: card.signupFee,
    });
  }
  return { ...LOOP_CHAIN, discounts };
}

// Henter og parser hele LOOP med to kald: centerlisten og prissiden. `http.getText(url)`
// leverer rå HTML (se http.mjs). `limit` begrænser antallet af Centre (live-tjek); det sparer
// ingen kald, men gør rapporten kort.
// Resultat: { chain, centers: [Center med offers], readErrors: [{ centerId, message }], warnings }.
// Kaster, hvis centerlisten eller rabatkortene ikke kan hentes eller læses.
export async function scrapeLoop({ http, today, limit } = {}) {
  const { centers, readErrors, warnings } = parseCenterList(
    await http.getText(LOOP_CENTER_LIST_URL),
    today,
    { limit },
  );
  const cards = parsePricesPage(await http.getText(LOOP_PRICES_URL));
  const chain = buildChain(cards, centers, warnings);
  return { chain, centers, readErrors, warnings };
}
