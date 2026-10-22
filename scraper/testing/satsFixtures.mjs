// Gemte rigtige svar fra sats.dk (scraper/fixtures/sats/, hentet 2026-10-22) og en falsk
// HTTP-klient, der svarer med dem i stedet for at gå på nettet.
import { readFileSync } from 'node:fs';

import { SATS_CENTER_LIST_URL, checkoutUrlFor, extractProps } from '../chains/sats.mjs';

const fixtureDir = new URL('../fixtures/sats/', import.meta.url);

export const satsFixture = (name) => readFileSync(new URL(name, fixtureDir), 'utf8');

// Erstatter sidens data-props med en ændret kopi, fx for at teste en forkert pris.
export function withProps(html, mutate) {
  const props = structuredClone(extractProps(html));
  mutate(props);
  const json = JSON.stringify(props).replace(/</g, '\\u003C');
  return html.replace(
    /(<script data-props="true" type="application\/json">)[\s\S]*?(<\/script>)/,
    (_, open, close) => `${open}${json}${close}`,
  );
}

// De tre Centre, der findes centersider for i fixtures.
export const FIXTURE_CLUBS = {
  412: { file: 'center-412-adelgade.html', path: '/traeningscenter/kobenhavn/kbh-adelgade' },
  437: { file: 'center-437-helsingor.html', path: '/traeningscenter/nordsjaelland/helsingor' },
  434: { file: 'center-434-roskilde.html', path: '/traeningscenter/roskilde/roskilde' },
};

// Den rigtige centerliste skåret ned til de Centre, der findes centersider for.
export const centerListWith = (clubIds = Object.keys(FIXTURE_CLUBS)) =>
  withProps(satsFixture('centerliste.html'), (props) => {
    props.clubs = props.clubs.filter((club) => clubIds.includes(club.id));
  });

// URL → HTML for en hel SATS-kørsel: centerliste, tre centersider og tre checkouts i det
// første Center (Adelgade, 412).
export function satsRoutes() {
  const routes = { [SATS_CENTER_LIST_URL]: centerListWith() };
  for (const { file, path } of Object.values(FIXTURE_CLUBS)) {
    routes[`https://www.sats.dk${path}`] = satsFixture(file);
  }
  const checkouts = {
    '1CLUB_ALLDAY_NOBND_GX': 'checkout-basic.html',
    REGION_ALLDAY_NOBND_GX: 'checkout-flexible.html',
    PREMIUM_NOBND: 'checkout-premium.html',
  };
  for (const [membershipKey, file] of Object.entries(checkouts)) {
    routes[checkoutUrlFor({ clubId: '412', membershipKey })] = satsFixture(file);
  }
  return routes;
}

// Falsk HTTP-klient med samme snitflade som http.mjs. En rute kan være HTML eller en Error,
// der kastes. Ukendte URL'er giver "HTTP 404" ligesom en rigtig side, der ikke findes.
export function createFixtureHttp(routes) {
  const requests = [];
  return {
    requests,
    async getText(url) {
      requests.push(url);
      const response = routes[url];
      if (response instanceof Error) throw response;
      if (response == null) throw new Error(`HTTP 404: ${url}`);
      return response;
    },
  };
}
