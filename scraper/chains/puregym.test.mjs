// PureGym-parseren testet mod gemte rigtige svar fra puregym.dk (fixtures/puregym/, hentet
// 2026-10-22). Forventningerne er aflæst på siderne og står direkte i testene.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PUREGYM_CENTER_LIST_URL,
  PUREGYM_PRICE_LIST_URL,
  parseAjaxResponse,
  parseCenterList,
  parseLegalText,
  parseMembershipForm,
  parsePriceList,
  scrapePuregym,
} from './puregym.mjs';
import { isInDenmark } from '../sanity.mjs';
import {
  ajaxUrl,
  centerListWith,
  createPuregymHttp,
  formUrl,
  postKey,
  productsIn,
  puregymFixture,
  puregymRoutes,
  withAjax,
  withCards,
} from '../testing/puregymFixtures.mjs';

const TODAY = '2026-10-22';
const INTRO_TEXT = 'INTROPRIS: Spar 25% frem til 30. november 2026';

const fullList = () => parseCenterList(puregymFixture('find-center.html'));

describe('PureGym centerliste (/find-center)', () => {
  test('finder alle 128 Centre med unikke id\'er og tilmeldingslinks', () => {
    const centers = fullList();
    assert.equal(centers.length, 128);
    assert.equal(new Set(centers.map((center) => center.id)).size, 128);
    assert.equal(new Set(centers.map((center) => center.signupUrl)).size, 128);
  });

  test('læser navn, adresse, koordinater, faciliteter og links for det første Center', () => {
    assert.deepEqual(fullList()[0], {
      nodeId: '31',
      centerName: 'Aalborg, Dannebrogsgade',
      pageUrl: 'https://www.puregym.dk/find-center/aalborg-dannebrogsgade',
      teaserPrices: { from: 246.75, standardFrom: 299 },
      id: 'puregym-115',
      chainId: 'puregym',
      name: 'PureGym Aalborg, Dannebrogsgade',
      address: 'Dannebrogsgade 58, 9000 Aalborg',
      location: { latitude: 57.053847, longitude: 9.905200000000036 },
      facilities: { groupClasses: true },
      signupUrl: 'https://www.puregym.dk/bliv-medlem/31/medlemskab',
    });
  });

  test('Drupal-noden i tilmeldingslinket er ikke det samme som Centrets id', () => {
    const aarhusgade = fullList().find((center) => center.nodeId === '118');
    assert.equal(aarhusgade.id, 'puregym-123');
    assert.equal(aarhusgade.name, 'PureGym Kbh Ø., Århusgade');
    assert.equal(aarhusgade.signupUrl, 'https://www.puregym.dk/bliv-medlem/118/medlemskab');
  });

  test('facilitets-id\'erne 502, 14 og 665 bliver sauna, holdtræning og døgnåbent', () => {
    const byId = (id) => fullList().find((center) => center.id === id);
    // Helgesvej (Frederiksberg Svømmehal) har sauna, Æbeløgade er døgnåben.
    assert.deepEqual(byId('puregym-211').facilities, { sauna: true, groupClasses: true });
    assert.deepEqual(byId('puregym-612').facilities, { groupClasses: true, open24h: true });
    // Asger Jorns Allé er døgnåben uden holdtræning på listen.
    assert.deepEqual(byId('puregym-283').facilities, { open24h: true });
  });

  test('en manglende facilitet er ukendt ("Ikke oplyst"), ikke nej', () => {
    const centers = fullList();
    assert.equal(centers.filter((center) => center.facilities.sauna).length, 1);
    assert.equal(centers.filter((center) => center.facilities.open24h).length, 12);
    for (const center of centers) {
      for (const value of Object.values(center.facilities)) assert.equal(value, true, center.id);
    }
  });

  test('HTML-tegn i adressen afkodes, og gaden skæres af navnet', () => {
    const glostrup = fullList().find((center) => center.address?.includes('Glostrup'));
    assert.equal(glostrup.address, 'Banegårdsvej 21, Butik 10 & 11, 2600 Glostrup');
    assert.equal(glostrup.name, 'PureGym Glostrup, Banegårdsvej');
  });

  test('alle Centre har navn, adresse med postnummer, link og koordinater i Danmark', () => {
    for (const center of fullList()) {
      assert.ok(center.name.startsWith('PureGym '), center.id);
      assert.match(center.address, /^.+, \d{4} .+$/, center.id);
      assert.match(center.signupUrl, /^https:\/\/www\.puregym\.dk\/bliv-medlem\/\d+\/medlemskab$/);
      assert.match(center.pageUrl, /^https:\/\/www\.puregym\.dk\/find-center\/[a-z0-9-]+$/);
      assert.ok(isInDenmark(center.location), center.id);
    }
  });

  test('en side uden centerliste giver en tydelig fejl', () => {
    assert.throws(() => parseCenterList('<html><body>Vedligehold</body></html>'), /centerliste/);
  });
});

describe('PureGym prisliste (/priser)', () => {
  test('Oprettelsesgebyr 99 kr og 0 kr i gebyr ved kortbetaling', () => {
    assert.deepEqual(parsePriceList(puregymFixture('priser.html')), { signupFee: 99, adminFee: 0 });
  });

  test('mangler rækken, er Oprettelsesgebyret ukendt, ikke 0', () => {
    const html = puregymFixture('priser.html').replace('<td>Oprettelse</td>', '<td>Opstart</td>');
    assert.equal(parsePriceList(html).signupFee, undefined);
  });
});

describe('PureGym tilmeldingsformular', () => {
  const PAGE = formUrl(118);

  test('læser medlemskabsformularen, ikke søgeformularen øverst på siden', () => {
    assert.deepEqual(parseMembershipForm(puregymFixture('bliv-medlem-118.html'), PAGE), {
      formId: 'buy_membership_v2_2_step_choose_membership_vp',
      fields: {
        form_build_id: 'form-EbeEuYI-PZYNZ0GXg5DqG0AegRhK5N__BGLyDJmPrJY',
        form_id: 'buy_membership_v2_2_step_choose_membership_vp',
      },
      buttons: {
        under30: { name: 'under_30_submit', value: 'Under 30 år' },
        over30: { name: 'over_30_submit', value: '30 år eller over' },
      },
      ajaxUrl: ajaxUrl(118),
    });
  });

  test('et nyt versioneret formularnavn læses fra siden', () => {
    const html = puregymFixture('bliv-medlem-118.html').replaceAll('v2_2', 'v3_1');
    const form = parseMembershipForm(html, PAGE);
    assert.equal(form.formId, 'buy_membership_v3_1_step_choose_membership_vp');
    assert.equal(form.fields.form_id, 'buy_membership_v3_1_step_choose_membership_vp');
  });

  test('nye skjulte felter sendes med, som en browser ville', () => {
    const formId = '<input data-drupal-selector="edit-buy-membership';
    const html = puregymFixture('bliv-medlem-118.html').replace(
      formId,
      `<input type="hidden" name="flow_type" value="desktop" />${formId}`,
    );
    assert.equal(parseMembershipForm(html, PAGE).fields.flow_type, 'desktop');
  });

  test('en side uden formular eller uden knap for en Aldersgruppe giver en tydelig fejl', () => {
    assert.throws(() => parseMembershipForm('<html></html>', PAGE), /medlemskabsformular/);
    const noOver30 = puregymFixture('bliv-medlem-118.html').replace('name="over_30_submit"', 'x');
    assert.throws(() => parseMembershipForm(noOver30, PAGE), /ingen knap for over30/);
  });
});

describe('PureGym ajax-svar (Drupal-kommandoer)', () => {
  test('Kbh Ø., Århusgade under 30: Unlimited med intropris og Core uden', () => {
    assert.deepEqual(parseAjaxResponse(puregymFixture('ajax-118-under30.json')), {
      centerName: 'Kbh Ø., Århusgade',
      nodeId: '118',
      memberships: [
        {
          productId: '127838',
          name: 'Unlimited',
          variant: 'Træn i 128 centre',
          currentPrice: 321.75,
          normalPrice: 429,
          campaignEndDate: '2026-11-30',
          campaignText: INTRO_TEXT,
          bindingMonths: 0,
        },
        {
          productId: '127223',
          name: 'Core',
          variant: 'Træn i dit stamcenter',
          currentPrice: 349,
          normalPrice: 349,
          bindingMonths: 0,
        },
      ],
    });
  });

  test('30+ giver andre produkt-id\'er og højere priser for de samme medlemskaber', () => {
    const { memberships } = parseAjaxResponse(puregymFixture('ajax-118-over30.json'));
    assert.deepEqual(
      memberships.map(({ productId, name, currentPrice, normalPrice }) => [
        productId,
        name,
        currentPrice,
        normalPrice,
      ]),
      [
        ['127842', 'Unlimited', 359.25, 479],
        ['127830', 'Core', 399, 399],
      ],
    );
  });

  test('Odense 30+ har fire medlemskaber; "Core og Hold" findes kun her', () => {
    const names = (file) => parseAjaxResponse(puregymFixture(file)).memberships.map((m) => m.name);
    assert.deepEqual(names('ajax-146-over30.json'), ['Unlimited', 'Plus', 'Core', 'Core og Hold']);
    assert.deepEqual(names('ajax-146-under30.json'), ['Unlimited', 'Plus', 'Core']);
  });

  test('det med småt: normalpris, kampagnens slutdato, overskrift og ingen Binding', () => {
    assert.deepEqual(
      parseLegalText(
        '<p><strong>INTROPRIS: Spar 25% frem til 30. november 2026</strong></p>' +
          '<div>&nbsp;* Tr&aelig;n for 246,75/md. frem til 30-11-2026 ved k&oslash;b … ' +
          'Normalpris for medlemskabet er 329,-/md. og opsigelsesperioden er ' +
          'l&oslash;bende m&aring;ned + 1 m&aring;ned.</div>',
      ),
      {
        normalPrice: 329,
        campaignEndDate: '2026-11-30',
        campaignText: INTRO_TEXT,
        bindingMonths: 0,
      },
    );
    assert.deepEqual(
      parseLegalText(
        '<div>* Prisen for medlemskabet er 1.049,-/md. ' +
          'Opsigelse er løbende måned + 1 måned.</div>',
      ),
      { normalPrice: 1049, bindingMonths: 0 },
    );
  });

  test('Drupals reserveformat (JSON i <textarea>) læses også', () => {
    // Sådan svarer PureGym (text/html), hvis kaldet ikke beder om JSON. Drupal koder "<" som
    // \u003C, ligesom JSON.stringify med replace nedenfor.
    const commands = JSON.parse(puregymFixture('ajax-118-under30.json'));
    const json = JSON.stringify(commands).replace(/</g, '\\u003C');
    assert.ok(!json.includes('</'));
    assert.deepEqual(parseAjaxResponse(`<textarea>${json}</textarea>`), parseAjaxResponse(json));
  });

  test('et svar, der ikke er Drupal-kommandoer, giver en tydelig fejl', () => {
    assert.throws(() => parseAjaxResponse('<html>Fejl</html>'), /ikke JSON/);
    assert.throws(() => parseAjaxResponse('[]'), /ingen medlemskaber/);
    const noCards = withAjax(puregymFixture('ajax-118-under30.json'), (commands) => {
      commands.splice(commands.findIndex((c) => c.selector === '#membership-form-wrapper'), 1);
    });
    assert.throws(() => parseAjaxResponse(noCards), /ingen medlemskabskort/);
  });
});

describe('hele PureGym-kørslen (falsk HTTP med gemte svar)', () => {
  const run = (routes = puregymRoutes(), options = {}) => {
    const http = createPuregymHttp(routes);
    return { http, result: scrapePuregym({ http, today: TODAY, ...options }) };
  };

  test('giver Kæden med Rabatter pr. medlemskab og præcis de forventede Tilbud', async () => {
    const { result } = run();
    const { chain, centers, readErrors, warnings } = await result;

    assert.deepEqual(readErrors, []);
    assert.deepEqual(warnings, ['puregym-107: Core og Hold findes kun for 30+ og springes over']);
    assert.deepEqual(chain, {
      id: 'puregym',
      name: 'PureGym',
      website: 'https://www.puregym.dk',
      discounts: [
        {
          discountGroup: 'aeldreSagen',
          percentOff: 15,
          offerNames: ['Core', 'Core og Hold'],
          signupFee: 0,
        },
        { discountGroup: 'aeldreSagen', percentOff: 20, offerNames: ['Plus'], signupFee: 0 },
        { discountGroup: 'aeldreSagen', percentOff: 25, offerNames: ['Unlimited'], signupFee: 0 },
        {
          discountGroup: 'student',
          percentOff: 40,
          months: 12,
          offerNames: ['Unlimited'],
          signupFee: 0,
        },
      ],
    });
    // Listens rækkefølge: Århus C. står før Kbh Ø. og Odense.
    assert.deepEqual(
      centers.map((center) => center.id),
      ['puregym-152', 'puregym-123', 'puregym-107'],
    );

    const signupUrl = 'https://www.puregym.dk/bliv-medlem/45/medlemskab';
    const fees = { signupFee: 99, adminFee: 0, bindingMonths: 0, signupUrl };
    const intro = (price) => ({
      campaignPrice: price,
      campaignMonths: 1,
      campaignEndDate: '2026-11-30',
      campaignText: INTRO_TEXT,
    });
    const noCampaign = { campaignPrice: null, campaignMonths: 0 };
    assert.deepEqual(centers[0], {
      id: 'puregym-152',
      chainId: 'puregym',
      name: 'PureGym Århus C., Scandinavian',
      address: 'Margrethepladsen 4, 8000 Århus C',
      location: { latitude: 56.1527586, longitude: 10.195402400000035 },
      facilities: { groupClasses: true },
      signupUrl,
      offers: [
        {
          id: 'puregym-152-unlimited',
          name: 'Unlimited',
          subscriptionType: 'Landsdækkende',
          standardPrice: { under30: 429, over30: 479 },
          ...intro(359.25),
          ...fees,
        },
        {
          id: 'puregym-152-plus',
          name: 'Plus',
          subscriptionType: 'Landsdækkende',
          standardPrice: { under30: 329, over30: 379 },
          ...intro(284.25),
          ...fees,
        },
        {
          id: 'puregym-152-core',
          name: 'Core',
          subscriptionType: 'Lokal center',
          standardPrice: { under30: 269, over30: 299 },
          ...noCampaign,
          ...fees,
        },
        {
          id: 'puregym-152-core-og-hold',
          name: 'Core og Hold',
          subscriptionType: 'Lokal center',
          standardPrice: { under30: 319, over30: 349 },
          ...noCampaign,
          ...fees,
        },
      ],
    });
  });

  test('Core og Plus varierer fra Center til Center; Unlimited er ens', async () => {
    const { centers } = await run().result;
    const prices = Object.fromEntries(
      centers.map((center) => [
        center.id,
        Object.fromEntries(center.offers.map((offer) => [offer.name, offer.standardPrice])),
      ]),
    );
    assert.deepEqual(prices['puregym-123'], {
      Unlimited: { under30: 429, over30: 479 },
      Core: { under30: 349, over30: 399 },
    });
    assert.deepEqual(prices['puregym-107'], {
      Unlimited: { under30: 429, over30: 479 },
      Plus: { under30: 329, over30: 379 },
      Core: { under30: 279, over30: 319 },
    });
  });

  test('intropris: den højeste af de to Aldersgruppers Kampagnepris bruges', async () => {
    // Under 30 betaler 321,75 og 30+ 359,25 for Unlimited i Århusgade frem til 30/11.
    const { centers } = await run().result;
    const unlimited = centers[1].offers.find((offer) => offer.name === 'Unlimited');
    assert.equal(unlimited.campaignPrice, 359.25);
    assert.equal(unlimited.campaignMonths, 1);
    assert.equal(unlimited.campaignEndDate, '2026-11-30');
  });

  test('en kampagne med under én måned tilbage regnes ikke med', async () => {
    const http = createPuregymHttp(puregymRoutes());
    const { centers, warnings } = await scrapePuregym({ http, today: '2026-11-15', limit: 1 });
    for (const offer of centers[0].offers) {
      assert.equal(offer.campaignPrice, null, offer.name);
      assert.equal(offer.campaignMonths, 0, offer.name);
    }
    assert.deepEqual(warnings, []);
  });

  test('en kampagne, der kun gælder den ene Aldersgruppe, tages ikke med', async () => {
    const routes = puregymRoutes();
    const key = postKey(ajaxUrl(118), 'over_30_submit');
    routes[key] = withAjax(routes[key], (commands) => {
      productsIn(commands).UNLIMITED.price = 479;
    });
    routes[key] = withCards(routes[key], (html) =>
      html.replace(/Træn for 359,25\/md\. frem til 30-11-2026/, 'Træn for 479/md.'),
    );
    const { centers, warnings } = await run(routes).result;

    const unlimited = centers[1].offers.find((offer) => offer.name === 'Unlimited');
    assert.equal(unlimited.campaignPrice, null);
    assert.deepEqual(unlimited.standardPrice, { under30: 429, over30: 479 });
    assert.ok(
      warnings.includes('puregym-123: kampagnen for Unlimited er ikke ens for begge Aldersgrupper'),
    );
  });

  test('kan normalprisen ikke læses, mangler Standardprisen, og der advares', async () => {
    const routes = puregymRoutes();
    const key = postKey(ajaxUrl(118), 'under_30_submit');
    routes[key] = withCards(routes[key], (html) =>
      html.replace('Prisen for medlemskabet er 349,-/md.', 'Pris: se butikken.'),
    );
    const { centers, warnings } = await run(routes).result;

    const core = centers[1].offers.find((offer) => offer.name === 'Core');
    assert.deepEqual(core.standardPrice, { over30: 399 });
    assert.ok(warnings.includes('puregym-123: normalprisen for Core (under30) kunne ikke læses'));
  });

  test('er høflig: liste, prisliste og tre kald pr. Center (formular + to POST)', async () => {
    const { http, result } = run();
    await result;

    const center = (node) => [
      `GET ${formUrl(node)}`,
      postKey(ajaxUrl(node), 'under_30_submit'),
      postKey(ajaxUrl(node), 'over_30_submit'),
    ];
    assert.deepEqual(http.requests, [
      `GET ${PUREGYM_CENTER_LIST_URL}`,
      `GET ${PUREGYM_PRICE_LIST_URL}`,
      ...center(45),
      ...center(118),
      ...center(146),
    ]);
  });

  test('sender formularens skjulte felter og knappens navn og værdi som Drupal ajax', async () => {
    const { http, result } = run(puregymRoutes(), { limit: 2 });
    await result;

    assert.deepEqual(http.posts[2], {
      url: ajaxUrl(118),
      fields: {
        form_build_id: 'form-EbeEuYI-PZYNZ0GXg5DqG0AegRhK5N__BGLyDJmPrJY',
        form_id: 'buy_membership_v2_2_step_choose_membership_vp',
        _triggering_element_name: 'under_30_submit',
        _triggering_element_value: 'Under 30 år',
      },
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
    });
    assert.equal(http.posts[3].fields._triggering_element_value, '30 år eller over');
  });

  test('et nyt versioneret formularnavn sendes videre, og priserne læses stadig', async () => {
    const routes = puregymRoutes();
    routes[formUrl(118)] = routes[formUrl(118)].replaceAll('v2_2', 'v2_3');
    for (const button of ['under_30_submit', 'over_30_submit']) {
      const key = postKey(ajaxUrl(118), button);
      routes[key] = withCards(routes[key], (html) => html.replaceAll('v2_2', 'v2_3'));
    }
    const { http, result } = run(routes);
    const { centers, readErrors } = await result;

    assert.deepEqual(readErrors, []);
    const posted = http.posts.filter((post) => post.url === ajaxUrl(118));
    const versioned = 'buy_membership_v2_3_step_choose_membership_vp';
    assert.deepEqual(
      posted.map((post) => post.fields.form_id),
      [versioned, versioned],
    );
    assert.equal(centers[1].offers.length, 2);
  });

  test('limit henter kun de første Centre (live-tjek med få kald)', async () => {
    const { http, result } = run(puregymRoutes(), { limit: 1 });
    const { centers } = await result;
    assert.deepEqual(centers.map((center) => center.id), ['puregym-152']);
    assert.equal(http.requests.length, 2 + 3);
  });

  test('en POST, der fejler, bliver en læsefejl for netop det Center', async () => {
    const routes = puregymRoutes();
    routes[postKey(ajaxUrl(118), 'over_30_submit')] = new Error('HTTP 500');
    const { centers, readErrors } = await run(routes).result;

    assert.deepEqual(readErrors, [{ centerId: 'puregym-123', message: 'HTTP 500' }]);
    assert.deepEqual(centers.map((center) => center.id), ['puregym-152', 'puregym-107']);
  });

  test('et ændret formularflow (ingen formular) bliver en læsefejl', async () => {
    const routes = puregymRoutes();
    routes[formUrl(146)] = '<html>Ny side</html>';
    const { readErrors } = await run(routes).result;
    assert.deepEqual(readErrors, [
      { centerId: 'puregym-107', message: 'Siden har ingen medlemskabsformular' },
    ]);
  });

  test('et svar for et andet Center end forventet afvises', async () => {
    const routes = puregymRoutes();
    routes[postKey(ajaxUrl(146), 'under_30_submit')] = puregymFixture('ajax-45-under30.json');
    const { readErrors } = await run(routes).result;
    assert.deepEqual(readErrors, [
      { centerId: 'puregym-107', message: 'Svaret (under30) er for /bliv-medlem/45, ikke 146' },
    ]);
  });

  test('kan prislisten ikke læses, mangler Oprettelsesgebyret, og der advares', async () => {
    const routes = { ...puregymRoutes(), [PUREGYM_PRICE_LIST_URL]: new Error('HTTP 503') };
    const { centers, warnings } = await run(routes).result;

    assert.equal(warnings[0], 'Prislisten kunne ikke læses: HTTP 503');
    for (const offer of centers.flatMap((center) => center.offers)) {
      assert.equal(offer.signupFee, undefined);
      // Admingebyret er 0 kr (kortbetaling), også uden prislisten.
      assert.equal(offer.adminFee, 0);
    }
  });

  test('kan centerlisten ikke hentes, fejler hele kørslen', async () => {
    const routes = { ...puregymRoutes(), [PUREGYM_CENTER_LIST_URL]: new Error('HTTP 502') };
    await assert.rejects(run(routes).result, /HTTP 502/);
  });

  test('en tom centerliste giver 0 Centre', async () => {
    const routes = { ...puregymRoutes(), [PUREGYM_CENTER_LIST_URL]: centerListWith([]) };
    const { centers, readErrors } = await run(routes).result;
    assert.deepEqual(centers, []);
    assert.deepEqual(readErrors, []);
  });
});
