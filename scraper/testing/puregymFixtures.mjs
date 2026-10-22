// Gemte rigtige svar fra puregym.dk (scraper/fixtures/puregym/, hentet 2026-10-22) og en falsk
// HTTP-klient, der svarer med dem i stedet for at gå på nettet.
//
// Svarene er trimmet, men ellers uændrede: /find-center har alle 128 Centre uden billeder,
// menuer og scripts; formularsiderne har kun søgeformularen og medlemskabsformularen;
// ajax-svarene har kun de Drupal-kommandoer, der vedrører medlemskaberne (settings med
// fw_membership_v2 og kortene i #membership-form-wrapper uden kortenes punktlister).
import { readFileSync } from 'node:fs';

import { PUREGYM_CENTER_LIST_URL, PUREGYM_PRICE_LIST_URL } from '../chains/puregym.mjs';

const fixtureDir = new URL('../fixtures/puregym/', import.meta.url);

export const puregymFixture = (name) => readFileSync(new URL(name, fixtureDir), 'utf8');

// De tre Centre, der findes formular- og ajax-svar for: Drupal-node i /bliv-medlem/<node>,
// Centrets id i GymFinder (teaserens data.id) og centersiden (til stikprøven).
export const FIXTURE_CENTERS = {
  118: { centerId: 'puregym-123', page: 'center-kbh-oe-aarhusgade.html' },
  45: { centerId: 'puregym-152', page: 'center-aarhus-c-scandinavian.html' },
  146: { centerId: 'puregym-107', page: 'center-odense-c-slotscenter.html' },
};

export const formUrl = (node) => `https://www.puregym.dk/bliv-medlem/${node}/medlemskab`;
export const ajaxUrl = (node) => `${formUrl(node)}?ajax_form=1&_wrapper_format=drupal_ajax`;

// Nøglen for en POST i ruterne: adresse + knappens navn.
export const postKey = (url, buttonName) => `POST ${url} ${buttonName}`;

// Den rigtige centerliste skåret ned til de givne Drupal-noder, i listens rækkefølge.
export function centerListWith(nodes = Object.keys(FIXTURE_CENTERS)) {
  const html = puregymFixture('find-center.html');
  const start = html.indexOf('<div class="map__result">');
  const end = html.lastIndexOf('</div>\n</body>');
  const results = html.slice(start, end).split(/(?=<div class="map__result">)/);
  const kept = results.filter((result) =>
    nodes.some((node) => result.includes(`href="/bliv-medlem/${node}/medlemskab"`)),
  );
  return `${html.slice(0, start)}${kept.join('')}${html.slice(end)}`;
}

// Ændrer Drupal-kommandoerne i et ajax-svar, fx for at teste en ny pris.
export function withAjax(text, mutate) {
  const commands = JSON.parse(text);
  mutate(commands);
  return JSON.stringify(commands);
}

// Medlemskaberne (settings) i et ajax-svar som { navn → produkt }.
export const productsIn = (commands) =>
  Object.fromEntries(
    Object.values(
      commands.find((command) => command.command === 'settings').settings.fw_membership_v2
        .membership.fitness,
    ).map((product) => [product.name, product]),
  );

// Kortene i et ajax-svar (HTML); `replace` får og returnerer HTML'en.
export function withCards(text, replace) {
  return withAjax(text, (commands) => {
    const insert = commands.find((command) => command.selector === '#membership-form-wrapper');
    insert.data = replace(insert.data);
  });
}

// Ændrer normalprisen for ét medlemskab uden kampagne (fx "Core") i et ajax-svar: prisen i
// settings, i det med småt og på det synlige kort.
export function withStandardPrice(text, name, price) {
  let productId;
  let oldPrice;
  const changed = withAjax(text, (commands) => {
    const product = Object.values(productsIn(commands)).find((p) => p.name === name);
    productId = product.id;
    oldPrice = product.price;
    product.price = price;
  });
  return withCards(changed, (html) => {
    const cardStart = html.indexOf(`data-product_id="${productId}"`);
    const cardEnd = html.indexOf('id="membership-cards"', cardStart);
    const card = html.slice(cardStart, cardEnd === -1 ? undefined : cardEnd);
    const newCard = card
      .replace(`card__price__title">${oldPrice}<`, `card__price__title">${price}<`)
      .replace(`medlemskabet er ${oldPrice},-`, `medlemskabet er ${price},-`);
    return html.replace(card, newCard);
  });
}

// URL eller POST-nøgle → svar for en hel PureGym-kørsel: centerliste, prisliste og for hvert
// Center formularsiden og et ajax-svar pr. Aldersgruppe.
export function puregymRoutes() {
  const routes = {
    [PUREGYM_CENTER_LIST_URL]: centerListWith(),
    [PUREGYM_PRICE_LIST_URL]: puregymFixture('priser.html'),
  };
  for (const node of Object.keys(FIXTURE_CENTERS)) {
    routes[formUrl(node)] = puregymFixture(`bliv-medlem-${node}.html`);
    routes[postKey(ajaxUrl(node), 'under_30_submit')] = puregymFixture(`ajax-${node}-under30.json`);
    routes[postKey(ajaxUrl(node), 'over_30_submit')] = puregymFixture(`ajax-${node}-over30.json`);
  }
  return routes;
}

// Falsk HTTP-klient med samme snitflade som http.mjs (getText og postForm). En rute kan være
// tekst eller en Error, der kastes. Ukendte adresser giver "HTTP 404" ligesom en rigtig side.
// `requests` husker kaldene; `posts` husker felterne i hver POST.
export function createPuregymHttp(routes) {
  const requests = [];
  const posts = [];
  const answer = (key, url) => {
    const response = routes[key];
    if (response instanceof Error) throw response;
    if (response == null) throw new Error(`HTTP 404: ${url}`);
    return response;
  };
  return {
    requests,
    posts,
    async getText(url) {
      requests.push(`GET ${url}`);
      return answer(url, url);
    },
    async postForm(url, fields, headers) {
      const key = postKey(url, fields._triggering_element_name);
      requests.push(key);
      posts.push({ url, fields, headers });
      return answer(key, url);
    },
  };
}
