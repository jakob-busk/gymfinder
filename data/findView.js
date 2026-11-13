// Find: ren visningslogik til kort og liste (kortudsnit, nøgleord på pins og forslag til at
// løsne Filtre). Ren JavaScript uden React Native eller Expo, så den kan testes direkte.

import { capitalize } from './centerDetail.js';
import { DISCOUNT_GROUPS, FACILITY_FILTERS, NOT_STATED_LABELS } from './matchning.js';

// Rådhuspladsen i København. Bruges, når brugeren ikke har nogen placering.
export const DEFAULT_LOCATION = { latitude: 55.6761, longitude: 12.5683 };

// Mindste udsnit (ca. 2 km), så kortet ikke zoomer helt ind på én pin.
const MIN_DELTA = 0.02;
// Luft rundt om pins, så de ikke ligger helt ude i kanten.
const PADDING = 1.4;

// Kortudsnit ({ latitude, longitude, latitudeDelta, longitudeDelta }), der viser brugerens
// placering og alle Centre i matches (CenterMatch fra Matchning).
export function mapRegion(userLocation, matches) {
  const points = [
    ...(userLocation ? [userLocation] : []),
    ...(matches ?? []).map((match) => match.center.location).filter(Boolean),
  ];
  if (points.length === 0) points.push(DEFAULT_LOCATION);

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * PADDING, MIN_DELTA),
    longitudeDelta: Math.max((maxLon - minLon) * PADDING, MIN_DELTA),
  };
}

// Hvilken slags pin et Center får på kortet: 'recommended' (Anbefalet, den største pin),
// 'chainBest' (Kædens bedste Center, fremhævet) eller 'center' (Kædens andre Centre). chains er
// ChainMatch fra Matchning.
export function pinKind(centerId, { chains, recommendedId }) {
  if (centerId === recommendedId) return 'recommended';
  return (chains ?? []).some((entry) => entry.best.center.id === centerId) ? 'chainBest' : 'center';
}

// Teksten, der folder Kædens andre Centre ud på et kæde-kort: "3 andre centre i PureGym".
export function otherCentersLabel(count, chain) {
  const name = chain?.name ?? 'kæden';
  return count === 1 ? `1 andet center i ${name}` : `${count} andre centre i ${name}`;
}

// Nøgleord til pin-boksen: de faciliteter Centret med sikkerhed har, med småt, fordi de står
// midt i en linje ("2,1 km fra dig · sauna, holdtræning").
export function centerKeywords(center) {
  return FACILITY_FILTERS.filter((facility) => center?.facilities?.[facility] === true).map(
    (facility) => NOT_STATED_LABELS[facility],
  );
}

// Højst så mange facilitetsmærker vises på et kæde-kort; resten ligger bag "+N mere".
export const FACILITY_TAG_LIMIT = 6;
// Højst så mange mærker i rækkerne for Kædens andre Centre.
export const FACILITY_TAG_ROW_LIMIT = 4;

const TAG_ORDER = { wanted: 0, notStated: 1, other: 2 };
const TAG_SUFFIX = { wanted: ', ønsket', notStated: ', ikke oplyst', other: '' };

// Facilitetsmærker for et Center ud fra de aktive Filtre, i den rækkefølge de vises:
//   'wanted'    Filteret er slået til, og Centret har faciliteten (✓)
//   'notStated' Filteret er slået til, og det er "Ikke oplyst" (?)
//   'other'     Centret har med sikkerhed faciliteten, men den er ikke ønsket (dæmpet)
// Faciliteter, Centret ikke har (eller ikke vides at have) uden at være ønsket, får intet mærke.
// Inden for hver status står faciliteterne i samme rækkefølge som facilities. limit er, hvor
// mange der vises; resten er hidden ("+N mere"). facilities og labels kan udvides, så flere
// faciliteter ikke kræver en ny funktion. Mærker har stort begyndelsesbogstav (fx "Sauna").
export function facilityTags(
  center,
  filters,
  { limit = FACILITY_TAG_LIMIT, facilities = FACILITY_FILTERS, labels = NOT_STATED_LABELS } = {},
) {
  const active = filters ?? {};
  const tags = [];
  for (const key of facilities) {
    const value = center?.facilities?.[key];
    const wanted = active[key] === true;
    let status = null;
    if (wanted && value === true) status = 'wanted';
    else if (wanted && value == null) status = 'notStated';
    else if (!wanted && value === true) status = 'other';
    if (!status) continue;
    const label = capitalize(labels[key] ?? key);
    tags.push({ key, label, status, accessibilityLabel: label + TAG_SUFFIX[status] });
  }
  // Array.prototype.sort er stabil, så faciliteternes rækkefølge bevares inden for en status.
  tags.sort((a, b) => TAG_ORDER[a.status] - TAG_ORDER[b.status]);

  const visible = tags.slice(0, limit);
  const hidden = tags.slice(limit);
  return { tags, visible, hidden, hiddenCount: hidden.length };
}

// "Ikke oplyst"-nøglerne fra Matchning uden faciliteterne, som i stedet vises som mærker
// (se facilityTags). Tilbage er fx binding, abonnementstype og maskiner.
export function notStatedWithoutFacilities(notStated) {
  return (notStated ?? []).filter((key) => !FACILITY_FILTERS.includes(key));
}

// Det Tilbud, et kort på Find viser og linker til: det Tilbud, Centret er rangeret på
// (rankedOffer fra Matchning). For et sikkert match er det det billigste Tilbud, der med
// sikkerhed matcher, så kortet viser det samme Tilbud, som Kædens bedste Center og Anbefalet
// er valgt på; ellers er det Centrets billigste Tilbud. Returnerer { priced, honestYearlyPrice,
// notStated, savingPerMonth } for det Tilbud (savingPerMonth er null uden Nuværende medlemskab).
export function chainCardOffer(match) {
  const priced = match.rankedOffer ?? match.bestOffer;
  const isBest = priced === match.bestOffer;
  return {
    priced,
    honestYearlyPrice: priced.honestYearlyPrice,
    // Et sikkert Tilbud har intet "Ikke oplyst", og det har Centret heller ikke.
    notStated: isBest ? match.notStated : [],
    savingPerMonth:
      match.savingPerMonth == null
        ? null
        : match.savingPerMonth + match.honestYearlyPrice - priced.honestYearlyPrice,
  };
}

const FILTER_SUGGESTIONS = {
  sauna: 'Slå sauna fra',
  groupClasses: 'Slå holdtræning fra',
  open24h: 'Slå døgnåbent fra',
  multiCenterAccess: 'Slå landsdækkende fra',
  noBinding: 'Tillad binding',
};

// Forslag til at løsne de aktive Filtre, når intet Center matcher (tom-tilstand med Ronnie).
// Uden brugerens placering kan Distance ikke beregnes, og maks. afstand skjuler alle Centre;
// så hjælper det ikke at øge afstanden, men at angive en adresse.
export function loosenFilterSuggestions(filters, { hasLocation = true } = {}) {
  const active = filters ?? {};
  const suggestions = [];

  if (active.maxDistanceKm != null) {
    suggestions.push(
      hasLocation
        ? `Øg maks. afstand (nu ${active.maxDistanceKm} km)`
        : 'Angiv din adresse på Profil, så afstanden til centrene kan beregnes',
    );
  }
  for (const [key, text] of Object.entries(FILTER_SUGGESTIONS)) {
    if (active[key] === true) suggestions.push(text);
  }
  if ((active.machines ?? []).length > 0) {
    suggestions.push(`Fjern krav om maskiner (${active.machines.join(', ')})`);
  }
  return suggestions;
}

// Linjen øverst på Find, der viser, hvilken Rabatprofil priserne er regnet med:
// "Priser regnet med: Studerende" eller "Priser uden rabat", når Rabatprofilen er tom.
export function discountProfileText(discountProfile) {
  const labels = (discountProfile ?? [])
    .map((group) => DISCOUNT_GROUPS[group]?.label)
    .filter(Boolean);
  return labels.length > 0 ? `Priser regnet med: ${labels.join(', ')}` : 'Priser uden rabat';
}

// Beskeden på Find, når der vises eksempeldata i stedet for de rigtige priser, med grunden.
// configured = appen har Firebase-nøgler; failed = databasen kunne ikke læses (så kan man prøve
// igen). Ellers er databasen tom.
export function sampleDataNotice({ configured, failed }) {
  if (!configured) {
    return (
      'Viser eksempeldata, fordi appen ikke er forbundet til GymFinders database. Priserne er ' +
      'derfor ikke de rigtige.'
    );
  }
  if (failed) {
    return (
      'Viser eksempeldata, fordi GymFinders database ikke kunne læses lige nu. Priserne er ' +
      'derfor ikke de rigtige.'
    );
  }
  return (
    'Viser eksempeldata, fordi der endnu ikke er hentet priser fra kæderne. Priserne er derfor ' +
    'ikke de rigtige.'
  );
}
