// Adressesøgning: forslag til adressefeltet og opslag af stednavne til Ronnie.
// Ren JavaScript uden React Native eller netværk, så den kan testes direkte. Selve kaldene ligger
// i services/Location.js.
//
// To kilder:
//   Photon (photon.komoot.io)   OpenStreetMap-data. Gratis, uden nøgle, og autocomplete er tilladt
//                               (fair use). Bruges altid, når der ikke er et Dataforsyningen-token.
//   GSearch (Dataforsyningen)   Danmarks officielle adresser og stednavne. Kræver et gratis token
//                               (EXPO_PUBLIC_DATAFORSYNINGEN_TOKEN). Svarer med koordinater i
//                               UTM zone 32 (EPSG:25832), som regnes om til breddegrad/længdegrad.
// Begge giver forslag på formen { address, location: { latitude, longitude } }.

// Først søgning, når brugeren har skrevet så mange tegn, og når der har været en kort pause.
export const MIN_QUERY_LENGTH = 3;
export const SEARCH_DEBOUNCE_MS = 300;
export const SUGGESTION_LIMIT = 6;

export const PHOTON_URL = 'https://photon.komoot.io/api/';
export const GSEARCH_URL = 'https://api.dataforsyningen.dk/rest/gsearch/v2.0/';

// Photon beder om en ærlig User-Agent, så de kan kontakte appen ved misbrug.
export const USER_AGENT = 'GymFinder/1.0 (studieprojekt, Expo-app)';

// Ca. Danmarks yderpunkter (inkl. Bornholm) som Photon-bbox: minLon,minLat,maxLon,maxLat.
const DENMARK_BBOX = '8.0,54.5,15.3,57.8';

export const ADDRESS_SEARCH_ERROR =
  'Adresseforslag kunne ikke hentes lige nu. Tjek din forbindelse, og prøv igen.';
export const NO_SUGGESTIONS_TEXT =
  'Ingen adresser fundet. Tjek stavningen, og skriv gerne postnummer og by.';

// True, når teksten er lang nok til at søge på.
export function isSearchable(query) {
  return String(query ?? '').trim().length >= MIN_QUERY_LENGTH;
}

// ---------------------------------------------------------------------------------------------
// Photon

// URL til Photon. kind 'address' giver adresser, veje og byer (til adressefeltet); 'place'
// giver også øer, landsdele og andre stednavne (til Ronnie, fx "Fyn").
export function photonSearchUrl(query, { kind = 'address', limit = SUGGESTION_LIMIT } = {}) {
  const params = [
    ['q', String(query ?? '').trim()],
    // Photon kan ikke filtrere på land; derfor hentes lidt flere og ikke-danske sorteres fra.
    ['limit', String(limit + 4)],
    ['lang', 'default'],
    ['bbox', DENMARK_BBOX],
  ];
  if (kind === 'address') {
    for (const layer of ['house', 'street', 'city', 'district', 'locality']) {
      params.push(['layer', layer]);
    }
  }
  const search = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `${PHOTON_URL}?${search}`;
}

// Photon-egenskaber → én adresselinje, fx "Østerbrogade 79, 2100 København Ø" eller
// "9990 Skagen". Et navngivet sted (fx en skole) får navnet foran adressen. En by har sit navn
// i name og ingen city, så navnet bruges som by.
export function formatPhotonAddress(properties) {
  const p = properties ?? {};
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const city = p.city || (street ? '' : p.name);
  const town = [p.postcode, city].filter(Boolean).join(' ');
  const name = p.name && p.name !== p.street && p.name !== city ? p.name : '';
  return [name, street, town].filter(Boolean).join(', ');
}

// Photons svar → op til limit forslag i Danmark. Dubletter (samme tekst) fjernes.
export function parsePhotonResults(json, limit = SUGGESTION_LIMIT) {
  const suggestions = [];
  for (const feature of json?.features ?? []) {
    const properties = feature?.properties ?? {};
    if (properties.countrycode !== 'DK') continue;
    const [longitude, latitude] = feature?.geometry?.coordinates ?? [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const address = formatPhotonAddress(properties);
    if (!address || suggestions.some((s) => s.address === address)) continue;
    suggestions.push({ address, location: { latitude, longitude } });
    if (suggestions.length >= limit) break;
  }
  return suggestions;
}

// ---------------------------------------------------------------------------------------------
// GSearch (Dataforsyningen)

// URL til GSearch. resource er fx 'husnummer' (adresser) eller 'stednavn' (by, ø, område).
export function gsearchUrl(resource, query, token, limit = SUGGESTION_LIMIT) {
  const q = encodeURIComponent(String(query ?? '').trim());
  return `${GSEARCH_URL}${resource}?q=${q}&limit=${limit}&token=${encodeURIComponent(token)}`;
}

// UTM zone 32N (ETRS89/EPSG:25832, som danske geodata bruger) → { latitude, longitude } i WGS84.
// Standardformlen for omvendt transversal Mercator på GRS80-ellipsoiden (præcis til under 1 m).
export function utm32ToWgs84(easting, northing) {
  const a = 6378137;
  const f = 1 / 298.257222101;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const lon0 = (9 * Math.PI) / 180;

  const x = easting - 500000;
  const m = northing / k0;
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);
  const n1 = a / Math.sqrt(1 - e2 * sin1 ** 2);
  const t1 = tan1 ** 2;
  const c1 = ep2 * cos1 ** 2;
  const r1 = (a * (1 - e2)) / (1 - e2 * sin1 ** 2) ** 1.5;
  const d = x / (n1 * k0);

  const lat =
    phi1 -
    ((n1 * tan1) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6) / 720);
  const lon =
    lon0 +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5) / 120) /
      cos1;

  return { latitude: (lat * 180) / Math.PI, longitude: (lon * 180) / Math.PI };
}

// Alle koordinatpar i en GeoJSON-geometri (punkt, linje eller flade).
function flattenCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) return [];
  if (typeof coordinates[0] === 'number') return [coordinates];
  return coordinates.flatMap(flattenCoordinates);
}

// GSearch-geometri → ét punkt. En adresse er et punkt; et stednavn som "Fyn" er en flade, så
// her bruges midten af dens udstrækning. Koordinater, der allerede er grader, bruges direkte.
export function gsearchLocation(geometry) {
  const points = flattenCoordinates(geometry?.coordinates).filter(
    ([x, y]) => Number.isFinite(x) && Number.isFinite(y),
  );
  if (points.length === 0) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;
  if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return { latitude: y, longitude: x };
  return utm32ToWgs84(x, y);
}

// GSearch-svar (en liste) → forslag. visningstekst er GSearch' egen tekst til visning.
export function parseGSearchResults(rows, limit = SUGGESTION_LIMIT) {
  const suggestions = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const address = String(row?.visningstekst ?? '').trim();
    const location = gsearchLocation(row?.geometri);
    if (!address || !location || suggestions.some((s) => s.address === address)) continue;
    suggestions.push({ address, location });
    if (suggestions.length >= limit) break;
  }
  return suggestions;
}
