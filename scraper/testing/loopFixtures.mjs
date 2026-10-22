// Gemte rigtige svar fra loopfitness.dk (scraper/fixtures/loop/, hentet 2026-10-22).
//
//   centerliste.html              /centre/ trimmet til 9 Centre med de svære tilfælde (styles,
//                                 eksterne scripts, manned_periods og private_groups fjernet)
//   centerliste-alle-137.html.gz  /centre/ helt urørt, alle 137 Centre
//   priser.html                   /priser/ med rabatkortene (styles og scripts fjernet)
//   centerside-145-aabenraa.html  centersiden for Aabenraa (til stikprøven)
//   abonnement-145-*.json         admin-ajax loop_get_subscription for Aabenraa
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

import {
  LOOP_CENTER_LIST_URL,
  LOOP_PRICES_URL,
  extractInlineObject,
} from '../chains/loop.mjs';

export { createFixtureHttp } from './satsFixtures.mjs';

const fixtureDir = new URL('../fixtures/loop/', import.meta.url);

export const loopFixture = (name) => readFileSync(new URL(name, fixtureDir), 'utf8');

export const loopJsonFixture = (name) => JSON.parse(loopFixture(name));

export const fullCenterList = () =>
  gunzipSync(readFileSync(new URL('centerliste-alle-137.html.gz', fixtureDir))).toString('utf8');

const LOCATIONS_MARKER = 'var locations = ';

// Erstatter `var locations` med en ændret kopi, fx for at teste en forkert pris.
export function withLocations(html, mutate) {
  const locations = structuredClone(extractInlineObject(html, LOCATIONS_MARKER));
  const changed = mutate(locations) ?? locations;
  const start = html.indexOf(LOCATIONS_MARKER) + LOCATIONS_MARKER.length;
  const end = html.indexOf(';\n', start);
  return html.slice(0, start) + JSON.stringify(changed) + html.slice(end);
}

// Ét Center i `var locations` ud fra LOOPs id (fx 145 = Aabenraa).
export const locationById = (locations, loopId) =>
  Object.values(locations).find((location) => location.id === loopId);

// Den trimmede centerliste med kun de givne Centre (LOOP-id'er).
export const centerListWith = (loopIds) =>
  withLocations(loopFixture('centerliste.html'), (locations) =>
    Object.fromEntries(
      Object.entries(locations).filter(([, location]) => loopIds.includes(location.id)),
    ),
  );

// URL → HTML for en hel LOOP-kørsel: centerlisten og prissiden.
export const loopRoutes = () => ({
  [LOOP_CENTER_LIST_URL]: loopFixture('centerliste.html'),
  [LOOP_PRICES_URL]: loopFixture('priser.html'),
});
