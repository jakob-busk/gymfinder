// Find: ren visningslogik til kort og liste (kortudsnit, nøgleord på pins og forslag til at
// løsne Filtre). Ren JavaScript uden React Native eller Expo, så den kan testes direkte.

import { FACILITY_FILTERS, NOT_STATED_LABELS } from './matchning.js';

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

// Nøgleord til pin-boksen: de faciliteter Centret med sikkerhed har (fx Sauna, Holdtræning).
export function centerKeywords(center) {
  return FACILITY_FILTERS.filter((facility) => center?.facilities?.[facility] === true).map(
    (facility) => NOT_STATED_LABELS[facility],
  );
}

const FILTER_SUGGESTIONS = {
  sauna: 'Slå Sauna fra',
  groupClasses: 'Slå Holdtræning fra',
  open24h: 'Slå Døgnåbent fra',
  multiCenterAccess: 'Slå "Adgang til flere centre" fra',
  noBinding: 'Tillad Binding',
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
        : 'Angiv din adresse på Profil, så afstanden til Centrene kan beregnes',
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
