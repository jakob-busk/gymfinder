import * as Location from 'expo-location';

import { formatPlaceAddress } from '../data/userProfile';
import {
  USER_AGENT,
  gsearchUrl,
  parseGSearchResults,
  parsePhotonResults,
  photonSearchUrl,
} from '../data/addressSearch';

// Adresser og stednavne slås op over nettet (se data/addressSearch.js), ikke med telefonens
// geokoder: expo-locations geocodeAsync kaster en fejl på Android, når brugeren ikke har givet
// adgang til placering, og adressen skal kunne skrives uden den adgang.
// Med et gratis token fra Dataforsyningen bruges Danmarks officielle adresser (GSearch). Uden
// token, eller hvis GSearch fejler, bruges Photon (OpenStreetMap), som ikke kræver nøgle.
const DATAFORSYNINGEN_TOKEN = process.env.EXPO_PUBLIC_DATAFORSYNINGEN_TOKEN;

// Et opslag, der hænger (dårlig forbindelse), afbrydes, så brugeren kan prøve igen.
const REQUEST_TIMEOUT_MS = 8000;

// Henter JSON. signal afbryder kaldet udefra (fx når brugeren har skrevet videre).
async function fetchJson(url, { signal, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener?.('abort', abort);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Adresseopslag svarede ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', abort);
  }
}

async function searchPhoton(query, { kind, signal }) {
  const json = await fetchJson(photonSearchUrl(query, { kind }), {
    signal,
    headers: { 'User-Agent': USER_AGENT },
  });
  return parsePhotonResults(json);
}

// GSearch i de givne ressourcer, i rækkefølge. Første ressource med resultater vinder.
async function searchGSearch(query, resources, { signal }) {
  for (const resource of resources) {
    const rows = await fetchJson(gsearchUrl(resource, query, DATAFORSYNINGEN_TOKEN), { signal });
    const suggestions = parseGSearchResults(rows);
    if (suggestions.length > 0) return suggestions;
  }
  return [];
}

// Søger først i GSearch (med token) og ellers i Photon. Kaster en fejl, hvis opslaget fejler.
async function search(query, { kind, resources, signal }) {
  if (DATAFORSYNINGEN_TOKEN) {
    try {
      const suggestions = await searchGSearch(query, resources, { signal });
      if (suggestions.length > 0) return suggestions;
    } catch (error) {
      if (signal?.aborted) throw error;
      console.warn('Dataforsyningen fejlede, prøver Photon:', error);
    }
  }
  return searchPhoton(query, { kind, signal });
}

// Adresseforslag til adressefeltet: [{ address, location: { latitude, longitude } }].
// Tom liste, hvis intet passer. Kaster en fejl, hvis opslaget fejler.
export function searchAddresses(query, { signal } = {}) {
  return search(query, { kind: 'address', resources: ['husnummer'], signal });
}

// Stednavn eller adresse → { latitude, longitude } (fx "Skagen", "Fyn" eller "Aarhus C").
// null, hvis stedet ikke kan findes. Bruges af Ronnies opslag og kræver ikke adgang til
// placering. Kaster en fejl, hvis opslaget fejler.
export async function geocodeAddress(placeName) {
  // Begge kilder søger kun i Danmark, så et ", Danmark" til sidst er overflødigt.
  const query = String(placeName ?? '').replace(/,\s*danmark\s*$/i, '');
  const [hit] = await search(query, {
    kind: 'place',
    resources: ['stednavn', 'postnummer', 'husnummer'],
  });
  return hit?.location ?? null;
}

// Brugerens nuværende placering og adresse ("Brug min placering").
// Returnerer { location, address } eller null, hvis brugeren afslår adgang til placering.
// address er tom, hvis placeringen ikke kan omsættes til en adresse.
export async function getCurrentPlace() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const location = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };

  try {
    const [place] = await Location.reverseGeocodeAsync(location);
    return { location, address: formatPlaceAddress(place) };
  } catch (error) {
    console.error('Omvendt geokodning fejlede:', error);
    return { location, address: '' };
  }
}
