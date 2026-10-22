// Prisalarmer: hvornår en Prisalarm er opfyldt, og hvad beskeden siger. Ren JavaScript uden
// React Native, Expo eller Firebase, så den kan testes direkte og bruges af nat-jobbet, som
// sender rigtige push-beskeder ud fra de samme regler og den samme Ærlig årspris (Matchning).
//
// En Prisalarm kan slås til to steder (CONTEXT.md):
//   1. På en Favorit: besked, når Favoritten falder i Ærlig årspris. Ligger på Favoritten som
//      priceAlert (se data/favorites.js). Besparelse = gemt pris - aktuel pris.
//   2. På Nuværende medlemskab: besked, når et Tilbud er billigere end det, brugeren betaler i
//      dag. Besparelse = Nuværende medlemskabs månedspris - Tilbuddets Ærlig årspris.
//
// Begge har en valgfri tærskel i kr/md (thresholdPerMonth). Uden tærskel (null) udløses alarmen
// ved enhver Besparelse på mindst MIN_SAVING_PER_MONTH, så ørebeløb fra afrunding ikke tæller.
//
// I Realtime Database (ud over Favoritterne):
//
//   Users/<uid>/currentMembershipAlert: {
//     thresholdPerMonth: tal | null,          null/udeladt = enhver Besparelse
//     enabledAt: ISO-tidspunkt,
//     notifiedHonestYearlyPrice: tal | null,  laveste Ærlig årspris, brugeren har fået besked om.
//                                             Der gives kun besked igen, når et Tilbud er
//                                             billigere end den. null = ingen besked endnu.
//   }
//   Users/<uid>/pushToken: { expoPushToken: 'ExponentPushToken[...]', platform, updatedAt }
//
// Notifikationer (lokale og push fra nat-jobbet) har data: { centerId, kind }, så et tryk åbner
// Centerdetalje for det Center. kind er 'favorite' eller 'currentMembership'.

import { formatKr, matchCenter } from './centerDetail.js';
import { matchCenters } from './matchning.js';

// Forudfyldt tærskel, når en Prisalarm slås til.
export const DEFAULT_THRESHOLD_PER_MONTH = 50;
// Mindste Besparelse, der tæller som et fald, når der ikke er nogen tærskel.
export const MIN_SAVING_PER_MONTH = 1;

const MAX_THRESHOLD_PER_MONTH = 2000;

const isPrice = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function normalizeThreshold(value) {
  return isPrice(value) && value > 0 ? value : null;
}

// Tærsklen, som brugeren skriver den, fx "50" eller "49,50". Tom tekst = ingen tærskel
// (enhver Besparelse). Returnerer { thresholdPerMonth } eller { error } med en dansk fejltekst.
export function parseThreshold(text) {
  const value = String(text ?? '').trim().replace(/\s*kr\.?(\/md)?$/i, '').replace(',', '.');
  if (!value) return { thresholdPerMonth: null };
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return { error: 'Skriv tærsklen i kr/md, fx 50.' };
  const threshold = Number(value);
  if (threshold > MAX_THRESHOLD_PER_MONTH) return { error: 'Tærsklen er for høj.' };
  return { thresholdPerMonth: threshold > 0 ? threshold : null };
}

// Tærsklen som tekst til redigering. Ny alarm = forudfyldt; uden tærskel = tom.
export function thresholdText(priceAlert) {
  if (!priceAlert) return String(DEFAULT_THRESHOLD_PER_MONTH);
  const threshold = normalizeThreshold(priceAlert.thresholdPerMonth);
  return threshold == null ? '' : String(threshold).replace('.', ',');
}

// Kort beskrivelse af en Prisalarm til UI, fx "mindst 50 kr/md" eller "ethvert fald".
export function describeThreshold(priceAlert) {
  const threshold = normalizeThreshold(priceAlert?.thresholdPerMonth);
  return threshold == null ? 'ethvert fald' : `mindst ${formatKr(threshold)}/md`;
}

// Er Besparelsen (kr/md) stor nok til at udløse alarmen?
export function savingReachesThreshold(savingPerMonth, thresholdPerMonth) {
  if (!Number.isFinite(savingPerMonth)) return false;
  const threshold = normalizeThreshold(thresholdPerMonth);
  return savingPerMonth >= Math.max(threshold ?? 0, MIN_SAVING_PER_MONTH);
}

// ---------- Prisalarm på en Favorit ----------

// Slår Prisalarmen til (priceAlert = { thresholdPerMonth }) eller fra (null) på én Favorit.
// Når den slås til, måles fald fra prisen lige nu (currentPrice), som brugeren ser på skærmen.
// Returnerer alle Favoritter med ændringen; findes Favoritten ikke, returneres de uændret.
export function setFavoritePriceAlert(favorites, centerId, priceAlert, currentPrice = null) {
  const favorite = favorites?.[centerId];
  if (!favorite) return favorites;
  const next = priceAlert
    ? { thresholdPerMonth: normalizeThreshold(priceAlert.thresholdPerMonth) }
    : null;
  return {
    ...favorites,
    [centerId]: {
      ...favorite,
      priceAlert: next,
      honestYearlyPrice: next && isPrice(currentPrice) ? currentPrice : favorite.honestYearlyPrice,
    },
  };
}

// Favoritter, hvis Prisalarm er opfyldt: aktuel Ærlig årspris er faldet mindst tærsklen under
// den gemte pris. Returnerer [{ kind: 'favorite', centerId, centerName, honestYearlyPrice,
// previousPrice, savingPerMonth }], største Besparelse først.
export function favoriteAlertTriggers({ favorites, centers, chains, user, today }) {
  const centersById = Object.fromEntries((centers ?? []).map((center) => [center.id, center]));
  const triggers = [];

  for (const [centerId, favorite] of Object.entries(favorites ?? {})) {
    if (!favorite?.priceAlert || !isPrice(favorite.honestYearlyPrice)) continue;
    const center = centersById[centerId];
    const price = matchCenter({ center, chains, user, today })?.honestYearlyPrice;
    if (!isPrice(price)) continue;
    const savingPerMonth = favorite.honestYearlyPrice - price;
    if (!savingReachesThreshold(savingPerMonth, favorite.priceAlert.thresholdPerMonth)) continue;
    triggers.push({
      kind: 'favorite',
      centerId,
      centerName: center.name,
      honestYearlyPrice: price,
      previousPrice: favorite.honestYearlyPrice,
      savingPerMonth,
    });
  }

  return triggers.sort((a, b) => b.savingPerMonth - a.savingPerMonth);
}

// Efter en besked måles næste fald fra den nye pris, så samme fald ikke giver besked igen.
export function markFavoriteNotified(favorite, honestYearlyPrice) {
  return { ...favorite, honestYearlyPrice };
}

// ---------- Prisalarm på Nuværende medlemskab ----------

export function newCurrentMembershipAlert({ thresholdPerMonth = null, now = new Date() } = {}) {
  return {
    thresholdPerMonth: normalizeThreshold(thresholdPerMonth),
    enabledAt: now.toISOString(),
    notifiedHonestYearlyPrice: null,
  };
}

// Data fra databasen eller AsyncStorage → Prisalarm på Nuværende medlemskab eller null (fra).
export function fromStoredCurrentMembershipAlert(stored) {
  if (!stored || typeof stored !== 'object') return null;
  return {
    thresholdPerMonth: normalizeThreshold(stored.thresholdPerMonth),
    enabledAt: typeof stored.enabledAt === 'string' ? stored.enabledAt : null,
    notifiedHonestYearlyPrice: isPrice(stored.notifiedHonestYearlyPrice)
      ? stored.notifiedHonestYearlyPrice
      : null,
  };
}

// Ny tærskel på en eksisterende alarm. Beskeder, der allerede er givet, huskes.
export function changeCurrentMembershipThreshold(alert, thresholdPerMonth) {
  return { ...alert, thresholdPerMonth: normalizeThreshold(thresholdPerMonth) };
}

// Det billigste Center inden for brugerens maks. afstand (Præferencer), hvis Besparelsen mod
// Nuværende medlemskab når tærsklen, og det er billigere end det, brugeren sidst fik besked om.
// Kun maks. afstand bruges som Filter: alarmen handler om pris, ikke faciliteter.
// Returnerer { kind: 'currentMembership', centerId, centerName, honestYearlyPrice,
// savingPerMonth } eller null.
export function currentMembershipAlertTrigger({ alert, centers, chains, user, today }) {
  const monthlyPrice = user?.currentMembership?.monthlyPrice;
  if (!alert || !isPrice(monthlyPrice)) return null;

  const maxDistanceKm = user?.preferences?.maxDistanceKm ?? null;
  const { centers: matches } = matchCenters({
    centers,
    chains,
    user,
    filters: maxDistanceKm == null ? {} : { maxDistanceKm },
    sortBy: 'honestYearlyPrice',
    location: user?.location ?? null,
    today,
  });
  const best = matches[0];
  if (!best) return null;

  const savingPerMonth = monthlyPrice - best.honestYearlyPrice;
  if (!savingReachesThreshold(savingPerMonth, alert.thresholdPerMonth)) return null;

  const notified = alert.notifiedHonestYearlyPrice;
  if (isPrice(notified) && notified - best.honestYearlyPrice < MIN_SAVING_PER_MONTH) return null;

  return {
    kind: 'currentMembership',
    centerId: best.center.id,
    centerName: best.center.name,
    honestYearlyPrice: best.honestYearlyPrice,
    savingPerMonth,
  };
}

export function markCurrentMembershipAlertNotified(alert, honestYearlyPrice) {
  return { ...alert, notifiedHonestYearlyPrice: honestYearlyPrice };
}

// ---------- Fælles ----------

// Har brugeren mindst én Prisalarm slået til? Så skal der være et push-token.
export function hasAnyPriceAlert({ favorites, currentMembershipAlert }) {
  if (currentMembershipAlert) return true;
  return Object.values(favorites ?? {}).some((favorite) => Boolean(favorite?.priceAlert));
}

const kr = (amount) => formatKr(Math.round(amount));

// Beskeden for en opfyldt alarm: { title, body, data: { centerId, kind } }.
export function priceAlertMessage(trigger) {
  const data = { centerId: trigger.centerId, kind: trigger.kind };
  if (trigger.kind === 'currentMembership') {
    return {
      title: `Spar ${kr(trigger.savingPerMonth)}/md`,
      body:
        `${trigger.centerName} koster ${kr(trigger.honestYearlyPrice)}/md i ærlig årspris. ` +
        'Det er billigere end dit nuværende medlemskab.',
      data,
    };
  }
  return {
    title: `Prisfald: ${trigger.centerName}`,
    body:
      `Ærlig årspris er faldet ${kr(trigger.savingPerMonth)}/md ` +
      `til ${kr(trigger.honestYearlyPrice)}/md.`,
    data,
  };
}

// Centrets id fra en notifikations data, eller null. Bruges, når brugeren trykker på beskeden.
export function centerIdFromNotification(data) {
  const centerId = data?.centerId;
  return typeof centerId === 'string' && centerId ? centerId : null;
}
