// Sanity-regler for skrabede data. Et Tilbud, der fejler, skrives ikke; de gamle data i
// databasen beholdes, og fejlen logges. Reglerne er bevidst strenge: hellere ingen opdatering
// end en forkert pris, der kan udløse falske Prisalarmer.

export const PRICE_RANGE = { min: 50, max: 2000 };

// Højst ±50 % ændring af Standardprisen fra én nat til den næste.
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

// Standardpris er et tal eller { under30, over30 }; giver Aldersgruppernes priser som liste.
function standardPrices(standardPrice) {
  if (isNumber(standardPrice)) return { single: standardPrice };
  if (standardPrice && typeof standardPrice === 'object') return standardPrice;
  return {};
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
    const lowest = Math.min(...Object.values(prices).filter(isNumber));
    if (!isNumber(offer.campaignPrice) || offer.campaignPrice < 0) {
      problems.push('Kampagnepris er ikke et gyldigt tal');
    } else if (!(offer.campaignPrice < lowest)) {
      problems.push(
        `Kampagnepris ${offer.campaignPrice} er ikke lavere end Standardpris ${lowest}`,
      );
    }
  }

  if (previous?.standardPrice != null) {
    const before = standardPrices(previous.standardPrice);
    for (const [ageGroup, price] of priceEntries) {
      // Gammel pris uden Aldersgrupper sammenlignes med begge nye priser og omvendt.
      const old = before[ageGroup] ?? before.single ?? before.over30;
      if (!isNumber(price) || !isNumber(old) || old === 0) continue;
      const change = (price - old) / old;
      if (Math.abs(change) > MAX_NIGHTLY_CHANGE) {
        problems.push(
          `Standardpris (${ageGroup}) ændret ${Math.round(change * 100)} % på én nat ` +
            `(${old} → ${price} kr/md)`,
        );
      }
    }
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
