// Favoritter: Centre brugeren har gemt for at følge prisen. Ren JavaScript uden React Native,
// Expo eller Firebase, så den kan testes direkte og bruges af nat-jobbet (prisfald og push).
//
// Prisen, der følges på en Favorit, er den laveste Ærlig årspris blandt de Tilbud, brugeren kan
// bruge i Centret (CONTEXT.md). Den regnes med Matchning uden Filtre, ligesom på Centerdetalje,
// fordi Filtre kun er midlertidige krav på Find.
//
// I Realtime Database ligger Favoritterne under Users/<uid>/favorites med Centrets id som nøgle:
//
//   Users/<uid>/favorites/<centerId>: {
//     addedAt: ISO-tidspunkt,
//     honestYearlyPrice: tal | null,    Ærlig årspris, sidst brugeren fik den at vide (ved ♥ og
//                                       senere ved en Prisalarm). Grundlag for Besparelse ved fald.
//     priceAlert: { thresholdPerMonth: tal } | null
//                                       Prisalarm på Favoritten. null/udeladt = ingen alarm;
//                                       thresholdPerMonth = 0 (eller udeladt) betyder ethvert fald.
//   }
//
// Hver Favorit skrives på sin egen sti, så en Prisalarm kan slås til på én Favorit uden at røre
// de andre, og så nat-jobbet kan opdatere honestYearlyPrice efter en push. Databasen gemmer
// ikke null, så fromStoredFavorites sætter manglende felter tilbage til standardværdierne.

import { matchCenter } from './centerDetail.js';

const isPrice = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function normalizePriceAlert(value) {
  if (!value || typeof value !== 'object') return null;
  const threshold = value.thresholdPerMonth;
  return { thresholdPerMonth: isPrice(threshold) && threshold > 0 ? threshold : null };
}

function normalizeFavorite(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    addedAt: typeof value.addedAt === 'string' ? value.addedAt : null,
    honestYearlyPrice: isPrice(value.honestYearlyPrice) ? value.honestYearlyPrice : null,
    priceAlert: normalizePriceAlert(value.priceAlert),
  };
}

// Data fra databasen eller AsyncStorage → { [centerId]: Favorit }. Altid et objekt.
export function fromStoredFavorites(stored) {
  if (!stored || typeof stored !== 'object') return {};
  const favorites = {};
  for (const [centerId, value] of Object.entries(stored)) {
    const favorite = normalizeFavorite(value);
    if (favorite) favorites[centerId] = favorite;
  }
  return favorites;
}

// Favorit → det, der gemmes i databasen. En Prisalarm uden tærskel gemmes som tærskel 0, da
// databasen hverken gemmer null eller tomme objekter: { thresholdPerMonth: null } ville forsvinde
// helt, og alarmen ville være slået fra, næste gang den læses. fromStoredFavorites læser 0 som
// "ingen tærskel".
export function toStoredFavorite(favorite) {
  const { priceAlert, ...rest } = favorite;
  return {
    ...rest,
    priceAlert: priceAlert ? { thresholdPerMonth: priceAlert.thresholdPerMonth ?? 0 } : null,
  };
}

export function toStoredFavorites(favorites) {
  return Object.fromEntries(
    Object.entries(favorites ?? {}).map(([centerId, favorite]) => [
      centerId,
      toStoredFavorite(favorite),
    ]),
  );
}

// Den laveste Ærlig årspris blandt Centrets Tilbud for brugeren, eller null, hvis Centret ikke
// findes eller ikke har Tilbud. Samme tal som Centerdetalje viser som "Billigst for dig".
export function favoritePrice({ center, chains, user, today }) {
  return matchCenter({ center, chains, user, today })?.honestYearlyPrice ?? null;
}

// En ny Favorit. honestYearlyPrice er prisen lige nu (eller null, hvis den ikke kendes).
export function newFavorite({ honestYearlyPrice = null, now = new Date() } = {}) {
  return {
    addedAt: now.toISOString(),
    honestYearlyPrice: isPrice(honestYearlyPrice) ? honestYearlyPrice : null,
    priceAlert: null,
  };
}

export function addFavorite(favorites, centerId, favorite) {
  return { ...favorites, [centerId]: favorite };
}

export function removeFavorite(favorites, centerId) {
  const { [centerId]: removed, ...rest } = favorites;
  return rest;
}

// Rækkerne på Favoritter-skærmen: én pr. Favorit med aktuel Ærlig årspris og ændringen siden
// den gemte pris. Billigste først; Centre, der ikke findes længere eller ikke har Tilbud, til sidst.
// Returnerer [{ centerId, center, chain, match, honestYearlyPrice, priceChange, favorite }];
// match er en CenterMatch fra Matchning eller null. priceChange er kr/md (negativ = faldet).
export function favoriteRows({ favorites, centers, chains, user, today }) {
  const centersById = Object.fromEntries((centers ?? []).map((center) => [center.id, center]));

  const rows = Object.entries(favorites ?? {}).map(([centerId, favorite]) => {
    const center = centersById[centerId] ?? null;
    const match = matchCenter({ center, chains, user, today });
    const price = match?.honestYearlyPrice ?? null;
    const saved = favorite.honestYearlyPrice;
    return {
      centerId,
      center,
      chain: match?.chain ?? null,
      match,
      honestYearlyPrice: price,
      priceChange: price != null && saved != null ? price - saved : null,
      favorite,
    };
  });

  return rows.sort((a, b) => {
    if (a.honestYearlyPrice == null) return b.honestYearlyPrice == null ? 0 : 1;
    if (b.honestYearlyPrice == null) return -1;
    return a.honestYearlyPrice - b.honestYearlyPrice;
  });
}
