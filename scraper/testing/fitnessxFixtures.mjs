// Gemte rigtige svar fra fitnessx.dk (scraper/fixtures/fitnessx/, hentet 2026-10-22) og ruter til
// den falske HTTP-klient (createFixtureHttp i satsFixtures.mjs).
import { readFileSync } from 'node:fs';

import {
  FITNESSX_CENTER_LIST_URL,
  FITNESSX_PRICE_LIST_URL,
  extractAjaxObject,
} from '../chains/fitnessx.mjs';

const fixtureDir = new URL('../fixtures/fitnessx/', import.meta.url);

export const fitnessxFixture = (name) => readFileSync(new URL(name, fixtureDir), 'utf8');

// Centersiderne i fixtures: navn i centerlisten → fil og URL.
export const FIXTURE_CENTERS = {
  'Aarhus C, Ankersgade': {
    file: 'center-aarhus-ankersgade.html',
    url: 'https://fitnessx.dk/fitness/fitness-aarhus/fitness-aarhus-c-ankersgade-12/',
  },
  'København S, Lindgreens Allé': {
    file: 'center-kbh-lindgreens-alle.html',
    url: 'https://fitnessx.dk/fitness/fitness-koebenhavn/fitness-kobenhavn-s-lindgreens-alle-9/',
  },
  'København V, Carlsberg Byen': {
    file: 'center-kbh-carlsberg.html',
    url:
      'https://fitnessx.dk/fitness/fitness-koebenhavn/' +
      'fitness-kobenhavn-v-carlsberg-byen-torvald-bindesboells-pl-1/',
  },
  'Roskilde, Skomagergade': {
    file: 'center-roskilde-skomagergade.html',
    url: 'https://fitnessx.dk/fitness/fitness-roskilde/roskilde-skomagergade/',
  },
  Viborg: {
    file: 'center-viborg.html',
    url: 'https://fitnessx.dk/fitness/fitness-viborg/fitness-viborg-tingvej/',
  },
};

// GUID'er (medlemskabsdatalayer.location) for de gemte centersider.
export const GUIDS = {
  ankersgade: '45824a8c-6ffa-4a32-ba36-70d8cb0ebdef',
  carlsberg: '867170b0-fb40-42ae-b28b-0388f74ca902',
  hjoerring: 'cf7c4617-0e71-47b6-a4b0-33bf3b0f07ea',
  lindgreens: 'a89b5085-3e38-40ef-99cb-f91a1659d409',
  skomagergade: '26f84c06-f5e7-42b0-9036-06e677bad4c0',
  viborg: 'de206fd6-497e-4ccf-8998-946ba2b1aef1',
};

// Erstatter sidens sj_ajax_object med en ændret kopi, fx for at knytte en kampagne til Centret.
export function withAjaxObject(html, mutate) {
  const ajaxObject = structuredClone(extractAjaxObject(html));
  mutate(ajaxObject);
  return html.replace(
    /(var sj_ajax_object = )[\s\S]*?;(\n\/\/# sourceURL)/,
    (_, open, close) => `${open}${JSON.stringify(ajaxObject)};${close}`,
  );
}

// Finder medlemskaber efter titel (som på siden, med &#8211;).
export const membershipsTitled = (ajaxObject, pattern) =>
  ajaxObject.medlemskaber.filter((membership) => pattern.test(membership.title));

const LIST_ITEM = /<div class="center_map_list_item[ "][\s\S]*?<\/div><!--\.center_map_list_item-->/g;
const itemName = (item) => item.match(/<h2[^>]*>([^<]*)<\/h2>/)?.[1].trim();

// Den rigtige centerliste skåret ned til de navngivne Centre. `mutateItem(name, html)` kan ændre
// et Centers HTML, fx fjerne linket til centersiden.
export function centerListWith(names, mutateItem = (_, item) => item) {
  const html = fitnessxFixture('find-center.html');
  return html.replace(LIST_ITEM, (item) =>
    names.includes(itemName(item)) ? mutateItem(itemName(item), item) : '',
  );
}

// Fjerner "Se center"-knappen, så Centret står uden link til centersiden.
export const withoutCenterLink = (item) =>
  item.replace(/<a href="[^"]*" class="btn_center">Se center<\/a>/, '');

// De Centre, en hel testkørsel bruger: de fem med gemt centerside og Hjørring uden link. Under
// research manglede Hjørrings link; dens medlemskaber findes på de andre centersider.
export const FIXTURE_LIST_NAMES = [...Object.keys(FIXTURE_CENTERS), 'Hjørring'];

export const defaultCenterList = () =>
  centerListWith(FIXTURE_LIST_NAMES, (name, item) =>
    name === 'Hjørring' ? withoutCenterLink(item) : item,
  );

// URL → HTML for en hel Fitness X-kørsel.
export function fitnessxRoutes() {
  const routes = {
    [FITNESSX_CENTER_LIST_URL]: defaultCenterList(),
    [FITNESSX_PRICE_LIST_URL]: fitnessxFixture('oevrige-priser.html'),
  };
  for (const { file, url } of Object.values(FIXTURE_CENTERS)) routes[url] = fitnessxFixture(file);
  return routes;
}
