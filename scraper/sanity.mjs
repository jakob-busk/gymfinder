// Sanity-regler for skrabede data. Et Tilbud, der fejler, skrives ikke; de gamle data i
// databasen beholdes, og fejlen logges. Reglerne er bevidst strenge: hellere ingen opdatering
// end en forkert pris, der kan udløse falske Prisalarmer.

export const PRICE_RANGE = { min: 50, max: 2000 };

// Kampagnepriser må gerne være 0 kr (fx "træn gratis til 1. december").
export const CAMPAIGN_PRICE_RANGE = { min: 0, max: 2000 };

// Højst ±50 % ændring af Standardpris, Kampagnepris og Makkerpris fra én nat til den næste.
export const MAX_NIGHTLY_CHANGE = 0.5;

// Kæden springes over, hvis mere end 20 % af dens Tilbud og Centre fejler.
export const MAX_CHAIN_FAILURE_RATE = 0.2;

// Rektangel omkring Danmark inkl. Bornholm (Gedser ≈ 54,56 N, Skagen ≈ 57,75 N,
// Blåvandshuk ≈ 8,07 Ø, Christiansø ≈ 15,19 Ø).
export const DENMARK_BOUNDS = { minLat: 54.5, maxLat: 57.8, minLng: 8.0, maxLng: 15.25 };

// Nabolandenes hjørner inde i rektanglet skæres fra, så fx SATS' svenske centre ikke slipper
// igennem. Grænserne er grove, men ingen dansk by ligger i zonerne.
const NEIGHBOUR_ZONES = [
  // Skåne (Malmø 13,00 Ø, Landskrona 12,83 Ø); Bornholm ligger syd for 55,32 N.
  { name: 'Sverige', minLat: 55.32, minLng: 12.78 },
  // Helsingborg (12,69 Ø) over for Helsingør (12,62 Ø).
  { name: 'Sverige', minLat: 55.95, minLng: 12.66 },
  // Flensborg (54,78 N) syd for grænsen ved Padborg (54,82 N).
  { name: 'Tyskland', maxLat: 54.8, maxLng: 10.0 },
  // Rügen; Danmarks sydligste punkter øst for 12,3 Ø (Møn, Bornholm) ligger nord for 54,75 N.
  { name: 'Tyskland', maxLat: 54.75, minLng: 12.3 },
];

export function isInDenmark({ latitude, longitude }) {
  const { minLat, maxLat, minLng, maxLng } = DENMARK_BOUNDS;
  if (latitude < minLat || latitude > maxLat || longitude < minLng || longitude > maxLng) {
    return false;
  }
  const inZone = (zone) =>
    latitude >= (zone.minLat ?? -90) &&
    latitude <= (zone.maxLat ?? 90) &&
    longitude >= (zone.minLng ?? -180) &&
    longitude <= (zone.maxLng ?? 180);
  return !NEIGHBOUR_ZONES.some(inZone);
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

// En pris er et tal eller { under30, over30 }; giver Aldersgruppernes priser som objekt.
function standardPrices(standardPrice) {
  if (isNumber(standardPrice)) return { single: standardPrice };
  if (standardPrice && typeof standardPrice === 'object') return standardPrice;
  return {};
}

const AGE_GROUPS = ['under30', 'over30'];
const formatRange = ({ min, max }) => `${min}–${max} kr/md`;

// Prisen for en Aldersgruppe: { single } gælder alle.
const priceFor = (prices, ageGroup) => prices[ageGroup] ?? prices.single;

// Tjekker en pris (tal eller { under30, over30 }): et tal pr. Aldersgruppe inden for `range`.
// Er prisen pr. Aldersgruppe, skal begge være der.
function priceProblems(label, value, range) {
  const problems = [];
  const prices = standardPrices(value);
  if (Object.keys(prices).length === 0) return [`${label} er ikke et gyldigt tal`];
  if (!isNumber(value)) {
    for (const ageGroup of AGE_GROUPS) {
      if (!(ageGroup in prices)) problems.push(`${label} mangler for ${ageGroup}`);
    }
  }
  for (const [ageGroup, price] of Object.entries(prices)) {
    const name = ageGroup === 'single' ? label : `${label} (${ageGroup})`;
    if (!isNumber(price)) {
      problems.push(`${name} er ikke et gyldigt tal`);
    } else if (price < range.min || price > range.max) {
      problems.push(`${name} ${price} kr/md ligger uden for ${formatRange(range)}`);
    }
  }
  return problems;
}

// Højst ±50 % ændring fra sidste nat pr. Aldersgruppe. En gammel pris uden Aldersgrupper
// sammenlignes med begge nye priser og omvendt. Ingen pris i går (eller 0 kr) = intet at
// sammenligne med.
function nightlyChangeProblems(label, value, previousValue) {
  if (value == null || previousValue == null) return [];
  const before = standardPrices(previousValue);
  const problems = [];
  for (const [ageGroup, price] of Object.entries(standardPrices(value))) {
    const old =
      ageGroup === 'single'
        ? (before.single ?? before.over30)
        : (before[ageGroup] ?? before.single ?? before.over30);
    if (!isNumber(price) || !isNumber(old) || old === 0) continue;
    const change = (price - old) / old;
    if (Math.abs(change) > MAX_NIGHTLY_CHANGE) {
      const name = ageGroup === 'single' ? label : `${label} (${ageGroup})`;
      problems.push(
        `${name} ændret ${Math.round(change * 100)} % på én nat (${old} → ${price} kr/md)`,
      );
    }
  }
  return problems;
}

// En kampagnepris skal være lavere end prisen, den er kampagne for, i hver Aldersgruppe.
function notLowerProblems(label, value, baseLabel, base) {
  const campaign = standardPrices(value);
  const prices = standardPrices(base);
  if (isNumber(value)) {
    const lowest = Math.min(...Object.values(prices).filter(isNumber));
    return value < lowest ? [] : [`${label} ${value} er ikke lavere end ${baseLabel} ${lowest}`];
  }
  const problems = [];
  for (const ageGroup of AGE_GROUPS) {
    const price = campaign[ageGroup];
    const basePrice = priceFor(prices, ageGroup);
    if (isNumber(price) && isNumber(basePrice) && !(price < basePrice)) {
      problems.push(
        `${label} (${ageGroup}) ${price} er ikke lavere end ${baseLabel} ${basePrice}`,
      );
    }
  }
  return problems;
}

// Kædernes egne domæner. Et tilmeldingslink skal pege på et af dem (eller et underdomæne), så
// en fejllæsning aldrig sender brugeren til en fremmed side.
export const CHAIN_DOMAINS = ['sats.dk', 'loopfitness.dk', 'fitnessx.dk', 'puregym.dk'];

function isChainHttpsUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      CHAIN_DOMAINS.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
    );
  } catch {
    return false;
  }
}

// Tilbuddets tilmeldingslink (valgfrit): én https-URL på en Kædes domæne eller
// { under30, over30 } med én til hver Aldersgruppe.
function signupUrlProblems(label, value) {
  if (value == null) return [];
  if (typeof value === 'string') {
    return isChainHttpsUrl(value) ? [] : [`${label} er ikke en https-URL på Kædens domæne`];
  }
  if (typeof value !== 'object') return [`${label} er ikke en https-URL på Kædens domæne`];
  return AGE_GROUPS.filter((ageGroup) => !isChainHttpsUrl(value[ageGroup])).map(
    (ageGroup) => `${label} (${ageGroup}) er ikke en https-URL på Kædens domæne`,
  );
}

export function centerProblems(center) {
  const problems = [];
  for (const field of ['id', 'chainId', 'name', 'address', 'signupUrl']) {
    if (!isNonEmptyString(center?.[field])) problems.push(`Centret mangler ${field}`);
  }

  const { latitude, longitude } = center?.location ?? {};
  if (!isNumber(latitude) || !isNumber(longitude)) {
    problems.push('Centret mangler koordinater');
  } else if (!isInDenmark({ latitude, longitude })) {
    problems.push(`Koordinaterne ${latitude}, ${longitude} ligger ikke i Danmark`);
  }
  return problems;
}

// Problemer med ét Tilbud. `previous` er Tilbuddet fra sidste nat (eller undefined).
export function offerProblems(offer, previous) {
  const problems = [];
  for (const field of ['id', 'name', 'subscriptionType']) {
    if (!isNonEmptyString(offer?.[field])) problems.push(`Tilbuddet mangler ${field}`);
  }
  if (!isNumber(offer?.signupFee) || offer.signupFee < 0) {
    problems.push('Tilbuddet mangler Oprettelsesgebyr');
  }

  const prices = standardPrices(offer?.standardPrice);
  const priceEntries = Object.entries(prices);
  if (priceEntries.length === 0) problems.push('Tilbuddet mangler Standardpris');
  if (offer?.standardPrice && !isNumber(offer.standardPrice)) {
    for (const ageGroup of ['under30', 'over30']) {
      if (!(ageGroup in prices)) problems.push(`Standardpris mangler for ${ageGroup}`);
    }
  }

  for (const [ageGroup, price] of priceEntries) {
    if (!isNumber(price)) {
      problems.push(`Standardpris (${ageGroup}) er ikke et tal`);
    } else if (price < PRICE_RANGE.min || price > PRICE_RANGE.max) {
      problems.push(
        `Standardpris (${ageGroup}) ${price} kr/md ligger uden for ` +
          `${PRICE_RANGE.min}–${PRICE_RANGE.max} kr/md`,
      );
    }
  }

  if (offer?.campaignPrice != null) {
    const campaignIssues = priceProblems('Kampagnepris', offer.campaignPrice, CAMPAIGN_PRICE_RANGE);
    problems.push(...campaignIssues);
    if (campaignIssues.length === 0) {
      problems.push(
        ...notLowerProblems(
          'Kampagnepris',
          offer.campaignPrice,
          'Standardpris',
          offer.standardPrice,
        ),
      );
    }
  }

  if (offer?.partnerPrice != null) {
    problems.push(...priceProblems('Makkerpris', offer.partnerPrice, PRICE_RANGE));
  }

  if (offer?.partnerCampaignPrice != null) {
    const partnerCampaignIssues = priceProblems(
      'Makkerprisens kampagne',
      offer.partnerCampaignPrice,
      CAMPAIGN_PRICE_RANGE,
    );
    problems.push(...partnerCampaignIssues);
    if (partnerCampaignIssues.length === 0 && offer.partnerPrice != null) {
      problems.push(
        ...notLowerProblems(
          'Makkerprisens kampagne',
          offer.partnerCampaignPrice,
          'Makkerpris',
          offer.partnerPrice,
        ),
      );
    }
  }

  const partnerSignupFee = offer?.partnerSignupFee;
  if (partnerSignupFee != null && (!isNumber(partnerSignupFee) || partnerSignupFee < 0)) {
    problems.push('Oprettelsesgebyr for Træn med en makker er ikke et gyldigt tal');
  }

  problems.push(
    ...signupUrlProblems('Tilmeldingslinket', offer?.signupUrl),
    ...signupUrlProblems('Tilmeldingslinket til Makkerpris', offer?.partnerSignupUrl),
  );

  if (previous) {
    problems.push(
      ...nightlyChangeProblems('Standardpris', offer?.standardPrice, previous.standardPrice),
      ...nightlyChangeProblems('Kampagnepris', offer?.campaignPrice, previous.campaignPrice),
      ...nightlyChangeProblems('Makkerpris', offer?.partnerPrice, previous.partnerPrice),
    );
  }

  return problems;
}

// Kædeniveau: 0 Centre eller mere end 20 % fejl → Kæden springes over.
export function chainSkipReason({ centersFound, failures, validOffers }) {
  if (centersFound === 0) return 'Kæden gav 0 Centre';
  const total = failures + validOffers;
  const rate = total === 0 ? 1 : failures / total;
  if (rate > MAX_CHAIN_FAILURE_RATE) {
    return `${failures} af ${total} fejlede (${Math.round(rate * 100)} % > 20 %)`;
  }
  return null;
}
