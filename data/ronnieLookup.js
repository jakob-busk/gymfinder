// Ronnies værktøj "find centre nær stednavn": når brugeren spørger om et andet sted i landet
// (fx sommerhuset i Hornbæk), slår appen stednavnet op og giver Ronnie de nærmeste Centre dér med
// brugerens personlige Ærlig årspris. Så skal hele landet ikke sendes med i hver besked.
// Ren JavaScript uden React Native eller Expo; geokoderen gives med udefra, så det kan testes
// uden netværk.

import { matchCenters } from './matchning.js';
import { RONNIE_LOOKUP_TOOL_NAME, centerFacts } from './ronniePrompt.js';

// Så mange Centre giver ét opslag højst, og kun Centre inden for denne luftlinje fra stedet.
export const RONNIE_LOOKUP_LIMIT = 10;
export const RONNIE_LOOKUP_RADIUS_KM = 25;

// Ca. Danmarks yderpunkter (inkl. Bornholm). GymFinder kender kun Centre i Danmark.
const DENMARK_BOUNDS = { minLat: 54.5, maxLat: 57.8, minLon: 8.0, maxLon: 15.3 };

// Værktøjet, som OpenAI får at vide, at Ronnie kan kalde.
export const ronnieLookupTool = {
  type: 'function',
  function: {
    name: RONNIE_LOOKUP_TOOL_NAME,
    description:
      'Finder GymFinders Centre nær et stednavn i Danmark (by, adresse, postnummer eller ' +
      'område), med brugerens personlige Ærlig årspris. Brug det, når brugeren spørger om ' +
      'Centre et andet sted end ved sin egen adresse.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        stednavn: {
          type: 'string',
          description: 'Stednavnet som brugeren skrev det, fx "Hornbæk" eller "Aarhus C".',
        },
      },
      required: ['stednavn'],
      additionalProperties: false,
    },
  },
};

function isInDenmark({ latitude, longitude }) {
  return (
    latitude >= DENMARK_BOUNDS.minLat &&
    latitude <= DENMARK_BOUNDS.maxLat &&
    longitude >= DENMARK_BOUNDS.minLon &&
    longitude <= DENMARK_BOUNDS.maxLon
  );
}

// Slår et stednavn op og finder de nærmeste Centre, der matcher brugerens Filtre.
// Maks. afstand fra Filtrene gælder brugerens egen adresse, så her bruges i stedet
// RONNIE_LOOKUP_RADIUS_KM fra stedet.
// geocode: async (adresse) => { latitude, longitude } | null
// Returnerer { status, placeName, location, matches }, hvor status er
// 'found' | 'unknownPlace' | 'outsideDenmark' | 'lookupFailed'.
export async function findCentersNearPlace({
  placeName,
  geocode,
  centers,
  chains,
  user,
  filters,
  today,
}) {
  const name = String(placeName ?? '').trim();
  const result = (status, location = null, matches = []) => ({
    status,
    placeName: name,
    location,
    matches,
  });
  if (!name) return result('unknownPlace');

  let location;
  try {
    location = await geocode(`${name}, Danmark`);
  } catch {
    return result('lookupFailed');
  }
  if (!location) return result('unknownPlace');
  if (!isInDenmark(location)) return result('outsideDenmark', location);

  const matches = matchCenters({
    centers,
    chains,
    user,
    filters: { ...filters, maxDistanceKm: RONNIE_LOOKUP_RADIUS_KM },
    sortBy: 'distance',
    location,
    today,
  }).centers.slice(0, RONNIE_LOOKUP_LIMIT);
  return result('found', location, matches);
}

const STATUS_NOTES = {
  found: (name) => `Centre nær ${name}. afstandKm er luftlinje fra ${name}.`,
  noCenters: (name) =>
    `Ingen Centre inden for ${RONNIE_LOOKUP_RADIUS_KM} km af ${name}, der matcher brugerens Filtre.`,
  unknownPlace: (name) => `Stedet "${name}" kunne ikke findes. Bed om et mere præcist stednavn.`,
  outsideDenmark: (name) => `${name} ligger uden for Danmark. GymFinder kender kun Centre i Danmark.`,
  lookupFailed: () => 'Opslaget kunne ikke laves lige nu (fx ingen forbindelse). Prøv igen senere.',
};

// Svaret til Ronnie på et værktøjskald, som JSON-tekst.
export function lookupToolContent({ status, placeName, matches }) {
  const noteKey = status === 'found' && matches.length === 0 ? 'noCenters' : status;
  return JSON.stringify({
    sted: placeName,
    status,
    besked: STATUS_NOTES[noteKey](placeName),
    centre: matches.map(centerFacts),
  });
}

// Stednavnet fra Ronnies værktøjskald (arguments er en JSON-tekst). Tom tekst, hvis det mangler.
export function placeNameFromToolCall(toolCall) {
  try {
    const args = JSON.parse(toolCall?.function?.arguments ?? '{}');
    return typeof args?.stednavn === 'string' ? args.stednavn : '';
  } catch {
    return '';
  }
}
