// SATS-parseren testet mod gemte rigtige svar fra sats.dk (fixtures/sats/, hentet 2026-10-22).
// Forventningerne er aflæst på siderne og står direkte i testene.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SATS_CENTER_LIST_URL,
  checkoutUrlFor,
  parseCampaign,
  parseCenterList,
  parseCenterPage,
  parseCheckout,
  parseDanishNumber,
  scrapeSats,
  wholeMonthsUntil,
} from './sats.mjs';
import { isInDenmark } from '../sanity.mjs';
import {
  centerListWith,
  createFixtureHttp,
  satsFixture,
  satsRoutes,
  withProps,
} from '../testing/satsFixtures.mjs';

const TODAY = '2026-10-22';
const ADELGADE_URL = 'https://www.sats.dk/traeningscenter/kobenhavn/kbh-adelgade';

const checkoutLink = (memberType, clubId, membershipId) =>
  'https://www.sats.dk/bliv-medlem-sats/tilpas-medlemskab?memberTypeId=' +
  `MEMBERSHIP_MEMBER_TYPE_${memberType}&clubId=${clubId}&membershipId=${membershipId}`;

describe('SATS centerliste', () => {
  const centers = parseCenterList(satsFixture('centerliste.html'));

  test('finder alle 28 Centre med unikke id\'er', () => {
    assert.equal(centers.length, 28);
    assert.equal(new Set(centers.map((center) => center.id)).size, 28);
  });

  test('læser adresse, koordinater, faciliteter og link for Adelgade', () => {
    assert.deepEqual(centers[0], {
      clubId: '412',
      id: 'sats-412',
      chainId: 'sats',
      name: 'SATS Adelgade',
      address: 'Adelgade 5-7, 1304 København K',
      location: { latitude: 55.683026, longitude: 12.582453 },
      facilities: { sauna: true, groupClasses: true },
      signupUrl: 'https://www.sats.dk/traeningscenter/kobenhavn/kbh-adelgade',
    });
  });

  test('manglende sauna er ukendt ("Ikke oplyst"), ikke nej', () => {
    const roskilde = centers.find((center) => center.clubId === '434');
    assert.deepEqual(roskilde.facilities, { groupClasses: true });
    assert.equal('sauna' in roskilde.facilities, false);
  });

  test('alle Centre har adresse, link og koordinater i Danmark', () => {
    for (const center of centers) {
      assert.ok(center.name.startsWith('SATS '), center.id);
      assert.match(center.address, /^.+, \d{4} .+$/, center.id);
      assert.match(center.signupUrl, /^https:\/\/www\.sats\.dk\/traeningscenter\//, center.id);
      assert.ok(isInDenmark(center.location), center.id);
    }
  });

  test('en side uden data-props giver en tydelig fejl', () => {
    assert.throws(() => parseCenterList('<html><body>Vedligehold</body></html>'), /data-props/);
  });
});

describe('SATS centerside', () => {
  test('Adelgade: Basic, Flexible og Premium med pris pr. Aldersgruppe', () => {
    const page = parseCenterPage(satsFixture('center-412-adelgade.html'));

    assert.equal(page.clubId, '412');
    // Siden skriver "1304, København K"; kommaet efter postnummeret fjernes.
    assert.equal(page.address, 'Adelgade 5-7, 1304 København K');
    assert.deepEqual(page.offers, [
      {
        key: '1CLUB_ALLDAY_NOBND_GX',
        name: 'Basic',
        subscriptionType: 'Lokal center',
        standardPrice: { under30: 549, over30: 649 },
        signupUrl: checkoutLink('ADULT', 412, '1CLUB_ALLDAY_NOBND_GX'),
      },
      {
        key: 'REGION_ALLDAY_NOBND_GX',
        name: 'Flexible',
        subscriptionType: 'Landsdækkende',
        standardPrice: { under30: 599, over30: 699 },
        signupUrl: checkoutLink('ADULT', 412, 'REGION_ALLDAY_NOBND_GX'),
      },
      {
        key: 'PREMIUM_NOBND',
        name: 'Premium',
        subscriptionType: 'Landsdækkende',
        standardPrice: { under30: 699, over30: 799 },
        signupUrl: checkoutLink('ADULT', 412, 'PREMIUM_NOBND'),
      },
    ]);
  });

  test('Basic varierer fra Center til Center; Flexible og Premium er ens', () => {
    const prices = (file) =>
      parseCenterPage(satsFixture(file)).offers.map((offer) => [offer.name, offer.standardPrice]);

    assert.deepEqual(prices('center-437-helsingor.html'), [
      ['Basic', { under30: 449, over30: 549 }],
      ['Flexible', { under30: 599, over30: 699 }],
      ['Premium', { under30: 699, over30: 799 }],
    ]);
    assert.deepEqual(prices('center-434-roskilde.html'), [
      ['Basic', { under30: 399, over30: 499 }],
      ['Flexible', { under30: 599, over30: 699 }],
      ['Premium', { under30: 699, over30: 799 }],
    ]);
  });

  test('Studerende- og Seniorpriserne svarer til 20 % Rabat i alle tre Centre', () => {
    for (const file of [
      'center-412-adelgade.html',
      'center-437-helsingor.html',
      'center-434-roskilde.html',
    ]) {
      const { discountPercents } = parseCenterPage(satsFixture(file));
      // Studerende findes i begge Aldersgrupper (6 priser), Senior kun over 30 (3 priser).
      assert.deepEqual(discountPercents, {
        student: [20, 20, 20, 20, 20, 20],
        senior: [20, 20, 20],
      });
    }
  });

  test('et medlemskab, der kun findes for den ene Aldersgruppe, mangler den anden pris', () => {
    const html = withProps(satsFixture('center-412-adelgade.html'), (props) => {
      const over30 = props.becomeMemberSection.views.find((view) => view.id === 'over-30');
      over30.segments[0].memberships = over30.segments[0].memberships.slice(1);
    });
    const basic = parseCenterPage(html).offers.find((offer) => offer.name === 'Basic');
    assert.deepEqual(basic.standardPrice, { under30: 549 });
  });

  test('et ukendt medlemskab får ingen Abonnementstype i stedet for et gæt', () => {
    const html = withProps(satsFixture('center-412-adelgade.html'), (props) => {
      for (const view of props.becomeMemberSection.views) {
        view.segments[0].memberships[0].id = view.segments[0].memberships[0].id.replace(
          '1CLUB_',
          'NYT_',
        );
      }
    });
    const [first] = parseCenterPage(html).offers;
    assert.equal(first.subscriptionType, undefined);
  });
});

describe('SATS checkout: Oprettelsesgebyr, Binding og kampagne', () => {
  test('Basic uden binding: kampagne 0 kr til 1/12 og fri oprettelse', () => {
    assert.deepEqual(parseCheckout(satsFixture('checkout-basic.html'), TODAY), {
      signupFee: 0,
      bindingMonths: 0,
      campaign: {
        price: 0,
        endDate: '2026-12-01',
        months: 1,
        text: 'Træn for 0 kr. til 1. december + fri oprettelse',
      },
      monthlyPrice: 649,
      warnings: [],
    });
  });

  test('Flexible og Premium har samme kampagne og viser 30+-prisen', () => {
    const flexible = parseCheckout(satsFixture('checkout-flexible.html'), TODAY);
    const premium = parseCheckout(satsFixture('checkout-premium.html'), TODAY);

    assert.equal(flexible.monthlyPrice, 699);
    assert.equal(premium.monthlyPrice, 799);
    for (const terms of [flexible, premium]) {
      assert.equal(terms.signupFee, 0);
      assert.equal(terms.bindingMonths, 0);
      assert.deepEqual(terms.campaign, {
        price: 0,
        endDate: '2026-12-01',
        months: 1,
        text: 'Træn for 0 kr. til 1. december + fri oprettelse',
      });
    }
  });

  test('med 6 måneders binding: ingen kampagne og normalt Oprettelsesgebyr på 299 kr', () => {
    assert.deepEqual(parseCheckout(satsFixture('checkout-basic-6-mdr-binding.html'), TODAY), {
      signupFee: 299,
      bindingMonths: 6,
      campaign: null,
      monthlyPrice: 649,
      warnings: [],
    });
  });

  test('kampagnen tælles kun i hele måneder, så Ærlig årspris ikke bliver for lav', () => {
    // 22/11 er efter én hel måned; 1/12 nås ikke efter to.
    assert.equal(wholeMonthsUntil('2026-10-22', '2026-12-01'), 1);
    assert.equal(wholeMonthsUntil('2026-11-15', '2026-12-01'), 0);
    assert.equal(wholeMonthsUntil('2026-01-31', '2026-03-31'), 2);
    assert.equal(wholeMonthsUntil('2026-12-05', '2026-12-01'), 0);
  });

  test('en kampagne med under én måned tilbage regnes ikke med', () => {
    const terms = parseCheckout(satsFixture('checkout-basic.html'), '2026-11-15');
    assert.equal(terms.campaign, null);
    assert.deepEqual(terms.warnings, []);
  });

  test('uden vilkårstekst læses kampagnen fra overskriften, og året udledes', () => {
    assert.deepEqual(
      parseCampaign({ headline: 'Træn for 0 kr. til 1. december + fri oprettelse' }, TODAY),
      { price: 0, endDate: '2026-12-01' },
    );
    // 15. januar er passeret i 2026, så det må være 2027.
    assert.deepEqual(parseCampaign({ headline: 'Træn for 199 kr. til 15. januar' }, TODAY), {
      price: 199,
      endDate: '2027-01-15',
    });
  });

  test('vilkårsteksten med årstal vinder over overskriften', () => {
    const campaign = parseCampaign(
      {
        headline: 'Træn for 0 kr. til 1. december',
        terms: 'Pris frem til 15.01.27 er 99 kr., derefter fra 399 kr./md.',
      },
      TODAY,
    );
    assert.deepEqual(campaign, { price: 99, endDate: '2027-01-15' });
  });

  test('en kampagnetekst i et ukendt format giver en advarsel, ikke en gættet pris', () => {
    const html = withProps(satsFixture('checkout-basic.html'), (props) => {
      props.layout.checkoutSummary.activeCampaign.value = 'Halv pris hele vinteren!';
      delete props.layout.campaignDisclaimer;
    });
    const terms = parseCheckout(html, TODAY);
    assert.equal(terms.campaign, null);
    assert.deepEqual(terms.warnings, ['Kampagnen kunne ikke læses: "Halv pris hele vinteren!"']);
  });

  test('manglende Oprettelsesgebyr er ukendt, ikke 0', () => {
    const html = withProps(satsFixture('checkout-basic.html'), (props) => {
      props.layout.checkoutSummary.priceItems = [];
    });
    assert.equal(parseCheckout(html, TODAY).signupFee, undefined);
  });
});

describe('danske tal', () => {
  test('læser komma som decimal og punktum som tusindtalsseparator', () => {
    assert.equal(parseDanishNumber('439,20'), 439.2);
    assert.equal(parseDanishNumber('4.193,00 kr.'), 4193);
    assert.equal(parseDanishNumber('649 kr./md.'), 649);
    assert.equal(parseDanishNumber('549'), 549);
    assert.equal(parseDanishNumber('Gratis'), null);
    assert.equal(parseDanishNumber(undefined), null);
  });
});

describe('hele SATS-kørslen (falsk HTTP med gemte svar)', () => {
  test('giver Kæden med Rabatter og præcis de forventede Centre og Tilbud', async () => {
    const http = createFixtureHttp(satsRoutes());
    const result = await scrapeSats({ http, today: TODAY });

    assert.deepEqual(result.readErrors, []);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(result.chain, {
      id: 'sats',
      name: 'SATS',
      website: 'https://www.sats.dk',
      discounts: [
        { discountGroup: 'student', percentOff: 20 },
        { discountGroup: 'senior', percentOff: 20 },
        { discountGroup: 'aeldreSagen', percentOff: 25, signupFee: 0 },
      ],
    });
    assert.deepEqual(
      result.centers.map((center) => center.id),
      ['sats-412', 'sats-437', 'sats-434'],
    );

    const campaign = {
      campaignPrice: 0,
      campaignMonths: 1,
      campaignEndDate: '2026-12-01',
      campaignText: 'Træn for 0 kr. til 1. december + fri oprettelse',
      signupFee: 0,
      adminFee: 0,
      bindingMonths: 0,
    };
    assert.deepEqual(result.centers[2], {
      id: 'sats-434',
      chainId: 'sats',
      name: 'SATS Roskilde',
      address: 'Ro´s Torv 1, 1. 46, 4000 Roskilde',
      location: { latitude: 55.641418, longitude: 12.100165 },
      facilities: { groupClasses: true },
      signupUrl: 'https://www.sats.dk/traeningscenter/roskilde/roskilde',
      offers: [
        {
          id: 'sats-434-1club-allday-nobnd-gx',
          name: 'Basic',
          subscriptionType: 'Lokal center',
          standardPrice: { under30: 399, over30: 499 },
          ...campaign,
          signupUrl: checkoutLink('ADULT', 434, '1CLUB_ALLDAY_NOBND_GX'),
        },
        {
          id: 'sats-434-region-allday-nobnd-gx',
          name: 'Flexible',
          subscriptionType: 'Landsdækkende',
          standardPrice: { under30: 599, over30: 699 },
          ...campaign,
          signupUrl: checkoutLink('ADULT', 434, 'REGION_ALLDAY_NOBND_GX'),
        },
        {
          id: 'sats-434-premium-nobnd',
          name: 'Premium',
          subscriptionType: 'Landsdækkende',
          standardPrice: { under30: 699, over30: 799 },
          ...campaign,
          signupUrl: checkoutLink('ADULT', 434, 'PREMIUM_NOBND'),
        },
      ],
    });
  });

  test('centersidens fulde adresse bruges frem for listens kortere', async () => {
    // Fx står Fisketorvet i listen kun som "Fisketorvet Shopping Center, 1560 København V".
    const routes = satsRoutes();
    routes[SATS_CENTER_LIST_URL] = withProps(centerListWith(), (props) => {
      props.clubs[0].address.streetAddress = 'Kongens Nytorv';
    });
    const result = await scrapeSats({ http: createFixtureHttp(routes), today: TODAY });
    assert.equal(result.centers[0].address, 'Adelgade 5-7, 1304 København K');

    // Mangler adressen på centersiden, bruges listens.
    routes[ADELGADE_URL] = withProps(routes[ADELGADE_URL], (props) => {
      delete props.pageHeader.addressLink;
    });
    const fallback = await scrapeSats({ http: createFixtureHttp(routes), today: TODAY });
    assert.equal(fallback.centers[0].address, 'Kongens Nytorv, 1304 København K');
  });

  test('er høflig: én liste, én side pr. Center og kun tre checkouts i alt', async () => {
    const http = createFixtureHttp(satsRoutes());
    await scrapeSats({ http, today: TODAY });

    assert.deepEqual(http.requests, [
      SATS_CENTER_LIST_URL,
      'https://www.sats.dk/traeningscenter/kobenhavn/kbh-adelgade',
      'https://www.sats.dk/traeningscenter/nordsjaelland/helsingor',
      'https://www.sats.dk/traeningscenter/roskilde/roskilde',
      checkoutUrlFor({ clubId: '412', membershipKey: '1CLUB_ALLDAY_NOBND_GX' }),
      checkoutUrlFor({ clubId: '412', membershipKey: 'REGION_ALLDAY_NOBND_GX' }),
      checkoutUrlFor({ clubId: '412', membershipKey: 'PREMIUM_NOBND' }),
    ]);
  });

  test('limit henter kun de første Centre (live-tjek med få kald)', async () => {
    const http = createFixtureHttp(satsRoutes());
    const result = await scrapeSats({ http, today: TODAY, limit: 1 });
    assert.deepEqual(result.centers.map((center) => center.id), ['sats-412']);
    assert.equal(http.requests.length, 1 + 1 + 3);
  });

  test('en centerside, der fejler, bliver en læsefejl for netop det Center', async () => {
    const routes = satsRoutes();
    routes['https://www.sats.dk/traeningscenter/nordsjaelland/helsingor'] = new Error('HTTP 500');
    const result = await scrapeSats({ http: createFixtureHttp(routes), today: TODAY });

    assert.deepEqual(result.readErrors, [{ centerId: 'sats-437', message: 'HTTP 500' }]);
    assert.deepEqual(result.centers.map((center) => center.id), ['sats-412', 'sats-434']);
  });

  test('en centerside for et andet Center end forventet afvises', async () => {
    const routes = satsRoutes();
    routes['https://www.sats.dk/traeningscenter/roskilde/roskilde'] =
      satsFixture('center-437-helsingor.html');
    const result = await scrapeSats({ http: createFixtureHttp(routes), today: TODAY });

    assert.deepEqual(result.readErrors, [
      { centerId: 'sats-434', message: 'Centersiden er for clubId 437, ikke 434' },
    ]);
  });

  test('fejler checkout, mangler Oprettelsesgebyret, og der kommer en advarsel', async () => {
    const routes = satsRoutes();
    routes[checkoutUrlFor({ clubId: '412', membershipKey: 'PREMIUM_NOBND' })] =
      new Error('HTTP 503');
    const result = await scrapeSats({ http: createFixtureHttp(routes), today: TODAY });

    assert.deepEqual(result.warnings, ['Checkout for Premium kunne ikke læses: HTTP 503']);
    const premium = result.centers[0].offers.find((offer) => offer.name === 'Premium');
    assert.equal(premium.signupFee, undefined);
    assert.equal(premium.campaignPrice, null);
  });

  test('advarer, hvis checkout og centerside viser forskellig 30+-pris', async () => {
    const routes = satsRoutes();
    const key = checkoutUrlFor({ clubId: '412', membershipKey: 'PREMIUM_NOBND' });
    routes[key] = withProps(routes[key], (props) => {
      props.layout.checkoutSummary.totalPrice.value = '899 kr./md.';
    });
    const result = await scrapeSats({ http: createFixtureHttp(routes), today: TODAY });
    assert.deepEqual(result.warnings, [
      'Premium: checkout viser 899 kr/md, centersiden 799 kr/md',
    ]);
  });

  test('kan centerlisten ikke hentes, fejler hele kørslen', async () => {
    const routes = { ...satsRoutes(), [SATS_CENTER_LIST_URL]: new Error('HTTP 502') };
    await assert.rejects(
      scrapeSats({ http: createFixtureHttp(routes), today: TODAY }),
      /HTTP 502/,
    );
  });

  test('en tom centerliste giver 0 Centre', async () => {
    const routes = { ...satsRoutes(), [SATS_CENTER_LIST_URL]: centerListWith([]) };
    const result = await scrapeSats({ http: createFixtureHttp(routes), today: TODAY });
    assert.deepEqual(result.centers, []);
    assert.deepEqual(result.readErrors, []);
  });
});
