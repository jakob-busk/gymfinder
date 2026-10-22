// Nat-jobbet end-to-end: den rigtige SATS-parser med gemte svar fra sats.dk (falsk HTTP) og en
// falsk Realtime Database, der opfører sig som den rigtige ved multi-path-opdateringer.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { CENTERS as SAMPLE_CENTERS, CHAINS as SAMPLE_CHAINS } from '../data/const.js';
import { buildSeedUpdate, fromDatabase } from '../data/centerData.js';
import { matchCenters } from '../data/matchning.js';
import { SATS_CENTER_LIST_URL, checkoutUrlFor, scrapeSats } from './chains/sats.mjs';
import { formatReport, runNightlyJob, todayInDenmark } from './nightlyJob.mjs';
import { createFakeDatabase } from './testing/fakeDatabase.mjs';
import {
  centerListWith,
  createFixtureHttp,
  satsFixture,
  satsRoutes,
  withProps,
} from './testing/satsFixtures.mjs';

const NIGHT_1 = '2026-10-22';
const NIGHT_2 = '2026-10-23';
const NIGHT_3 = '2026-10-24';
const NIGHT_4 = '2026-10-25';

const ADELGADE_URL = 'https://www.sats.dk/traeningscenter/kobenhavn/kbh-adelgade';
const ROSKILDE_URL = 'https://www.sats.dk/traeningscenter/roskilde/roskilde';
const BASIC_412 = 'sats-412-1club-allday-nobnd-gx';

const satsScraper = (routes = satsRoutes(), today = NIGHT_1) => ({
  chainId: 'sats',
  scrape: () => scrapeSats({ http: createFixtureHttp(routes), today }),
});

// Kører én nat med SATS (og evt. flere Kæder) mod databasen.
const runNight = (db, today, { routes, extraScrapers = [], dryRun } = {}) =>
  runNightlyJob({
    db,
    today,
    dryRun,
    scrapers: [satsScraper(routes, today), ...extraScrapers],
  });

// Ændrer Standardprisen for Basic i en centerside (begge Aldersgrupper).
const withBasicPrice = (html, under30, over30) =>
  withProps(html, (props) => {
    for (const view of props.becomeMemberSection.views) {
      const price = view.id === 'under-30' ? under30 : over30;
      for (const segment of view.segments) {
        const basic = segment.memberships.find((membership) => membership.name === 'Basic');
        if (basic && segment.id.endsWith('ADULT')) basic.price = String(price);
      }
    }
  });

const seededDatabase = () => {
  const update = buildSeedUpdate({ chains: SAMPLE_CHAINS, centers: SAMPLE_CENTERS });
  const tree = {};
  for (const [path, value] of Object.entries(update)) {
    const [root, id] = path.split('/');
    tree[root] = { ...tree[root], [id]: value };
  }
  return createFakeDatabase(tree);
};

describe('normal kørsel', () => {
  test('skriver Kæde, Centre, Tilbud og prishistorik i én samlet opdatering', async () => {
    const db = createFakeDatabase();
    const { ok, report } = await runNight(db, NIGHT_1);

    assert.equal(ok, true);
    assert.equal(db.updates.length, 1);

    const data = db.snapshot();
    assert.deepEqual(data.Chains.sats.discounts, [
      { discountGroup: 'student', percentOff: 20 },
      { discountGroup: 'senior', percentOff: 20 },
      { discountGroup: 'aeldreSagen', percentOff: 25, signupFee: 0 },
    ]);
    assert.deepEqual(Object.keys(data.Centers), ['sats-412', 'sats-437', 'sats-434']);
    assert.deepEqual(data.Centers['sats-412'], {
      id: 'sats-412',
      chainId: 'sats',
      name: 'SATS Adelgade',
      address: 'Adelgade 5-7, 1304 København K',
      location: { latitude: 55.683026, longitude: 12.582453 },
      facilities: { sauna: true, groupClasses: true },
      signupUrl: ADELGADE_URL,
      lastSeen: NIGHT_1,
    });
    assert.deepEqual(Object.keys(data.Offers['sats-412']), [
      BASIC_412,
      'sats-412-region-allday-nobnd-gx',
      'sats-412-premium-nobnd',
    ]);
    assert.deepEqual(data.Offers['sats-412'][BASIC_412], {
      id: BASIC_412,
      name: 'Basic',
      subscriptionType: 'Lokal center',
      standardPrice: { under30: 549, over30: 649 },
      campaignPrice: 0,
      campaignMonths: 1,
      campaignEndDate: '2026-12-01',
      campaignText: 'Træn for 0 kr. til 1. december + fri oprettelse',
      signupFee: 0,
      adminFee: 0,
      bindingMonths: 0,
      signupUrl:
        'https://www.sats.dk/bliv-medlem-sats/tilpas-medlemskab?memberTypeId=' +
        'MEMBERSHIP_MEMBER_TYPE_ADULT&clubId=412&membershipId=1CLUB_ALLDAY_NOBND_GX',
      lastSeen: NIGHT_1,
    });
    assert.deepEqual(data.PriceHistory['sats-437']['sats-437-1club-allday-nobnd-gx'], {
      [NIGHT_1]: { standardPrice: { under30: 449, over30: 549 }, campaignPrice: 0 },
    });

    const [sats] = report.chains;
    assert.equal(sats.status, 'written');
    assert.equal(sats.centersFound, 3);
    assert.equal(sats.validOffers, 9);
    assert.equal(sats.newOffers.length, 9);
    assert.deepEqual(sats.failures, []);

    const markdown = formatReport(report);
    assert.match(markdown, /## sats: OK/);
    const roskildeRow = '| SATS Roskilde | Basic | 399 / 499 | 0 kr i 1 md. | 0 | 0 md. |';
    assert.ok(markdown.includes(roskildeRow));
  });

  test('appen kan læse de skrevne data og beregne Ærlig årspris med Matchning', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const { Chains, Centers, Offers } = db.snapshot();
    const { chains, centers } = fromDatabase({ chains: Chains, centers: Centers, offers: Offers });

    assert.equal(centers.length, 3);
    const roskilde = centers.find((center) => center.id === 'sats-434');
    // Ukendt sauna og døgnåbent = "Ikke oplyst".
    assert.deepEqual(roskilde.facilities, { sauna: null, groupClasses: true, open24h: null });

    const result = matchCenters({
      centers,
      chains,
      user: { birthDate: '1990-05-01', discountProfile: [], currentMembership: null },
      filters: {},
      sortBy: 'honestYearlyPrice',
      location: { latitude: 55.6761, longitude: 12.5683 },
      today: NIGHT_1,
    });
    const roskildeResult = result.centers.find((entry) => entry.center.id === 'sats-434');
    // 30+: Basic 0 kr i 1 måned, derefter 11 × 499 kr, ingen Oprettelsesgebyr → 5489 / 12.
    assert.equal(roskildeResult.bestOffer.offer.name, 'Basic');
    assert.equal(Math.round(roskildeResult.honestYearlyPrice * 100) / 100, 457.42);
  });

  test('anden nat med samme priser: ingen ændringer, nyt "sidst set" og ny historik', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const { report } = await runNight(db, NIGHT_2);

    const [sats] = report.chains;
    assert.deepEqual(sats.priceChanges, []);
    assert.deepEqual(sats.newOffers, []);
    const data = db.snapshot();
    assert.equal(data.Offers['sats-412'][BASIC_412].lastSeen, NIGHT_2);
    assert.deepEqual(Object.keys(data.PriceHistory['sats-412'][BASIC_412]), [NIGHT_1, NIGHT_2]);
  });

  test('en prisændring inden for ±50 % skrives og står i rapporten', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = satsRoutes();
    routes[ADELGADE_URL] = withBasicPrice(routes[ADELGADE_URL], 499, 599);
    const { report } = await runNight(db, NIGHT_2, { routes });

    assert.deepEqual(report.chains[0].priceChanges, [
      {
        centerId: 'sats-412',
        offerId: BASIC_412,
        before: { standardPrice: { under30: 549, over30: 649 }, campaignPrice: 0 },
        after: { standardPrice: { under30: 499, over30: 599 }, campaignPrice: 0 },
      },
    ]);
    assert.deepEqual(db.snapshot().Offers['sats-412'][BASIC_412].standardPrice, {
      under30: 499,
      over30: 599,
    });
  });

  test('andre Kæder og brugerdata røres ikke', async () => {
    const db = seededDatabase();
    const before = db.snapshot();
    await db.ref('Users/abc').update({ name: 'Test' });
    await runNight(db, NIGHT_1);
    const after = db.snapshot();

    assert.deepEqual(after.Chains.puregym, before.Chains.puregym);
    assert.deepEqual(after.Centers['puregym-oesterbro'], before.Centers['puregym-oesterbro']);
    assert.deepEqual(after.Offers['loop-valby'], before.Offers['loop-valby']);
    assert.deepEqual(after.Users, { abc: { name: 'Test' } });
  });

  test('en tør kørsel beregner opdateringen, men skriver intet', async () => {
    const db = createFakeDatabase();
    const { ok, update } = await runNight(db, NIGHT_1, { dryRun: true });

    assert.equal(ok, true);
    assert.equal(db.updates.length, 0);
    assert.deepEqual(db.snapshot(), {});
    assert.ok(update[`Offers/sats-412/${BASIC_412}`]);
  });

  test('en tør kørsel uden database regner databasen som tom', async () => {
    const { ok, report } = await runNightlyJob({
      db: null,
      today: NIGHT_1,
      dryRun: true,
      scrapers: [satsScraper()],
    });
    assert.equal(ok, true);
    assert.equal(report.chains[0].validOffers, 9);
  });
});

describe('sanity-fejl', () => {
  test('et Tilbud med umulig pris skrives ikke; gamle data beholdes, fejlen logges', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = satsRoutes();
    routes[ROSKILDE_URL] = withBasicPrice(routes[ROSKILDE_URL], '5.000', '5.000');
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    // 1 af 9 fejler (11 %), så Kæden skrives stadig.
    assert.equal(ok, true);
    const [sats] = report.chains;
    assert.equal(sats.status, 'written');
    assert.deepEqual(sats.failures, [
      {
        centerId: 'sats-434',
        offerId: 'sats-434-1club-allday-nobnd-gx',
        problems: [
          'Standardpris (under30) 5000 kr/md ligger uden for 50–2000 kr/md',
          'Standardpris (over30) 5000 kr/md ligger uden for 50–2000 kr/md',
          'Standardpris (under30) ændret 1153 % på én nat (399 → 5000 kr/md)',
          'Standardpris (over30) ændret 902 % på én nat (499 → 5000 kr/md)',
        ],
      },
    ]);
    const basic = db.snapshot().Offers['sats-434']['sats-434-1club-allday-nobnd-gx'];
    assert.deepEqual(basic.standardPrice, { under30: 399, over30: 499 });
    assert.equal(basic.lastSeen, NIGHT_1);
    assert.equal(basic.missingNights, undefined);
    // Ingen prishistorik for den fejlende pris.
    const history = db.snapshot().PriceHistory['sats-434']['sats-434-1club-allday-nobnd-gx'];
    assert.deepEqual(Object.keys(history), [NIGHT_1]);
    assert.match(formatReport(report), /Fejl i sats-434 \/ sats-434-1club-allday-nobnd-gx/);
  });

  test('en prisændring over 50 % på én nat skrives ikke', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = satsRoutes();
    routes[ADELGADE_URL] = withBasicPrice(routes[ADELGADE_URL], 249, 649);
    const { report } = await runNight(db, NIGHT_2, { routes });

    assert.deepEqual(report.chains[0].failures[0].problems, [
      'Standardpris (under30) ændret -55 % på én nat (549 → 249 kr/md)',
    ]);
    assert.deepEqual(report.chains[0].priceChanges, []);
    assert.deepEqual(db.snapshot().Offers['sats-412'][BASIC_412].standardPrice, {
      under30: 549,
      over30: 649,
    });
  });

  test('Kampagnepris, der ikke er lavere end Standardprisen, afvises', async () => {
    const routes = satsRoutes();
    const basicCheckout = Object.keys(routes).find((url) => url.includes('1CLUB_ALLDAY_NOBND_GX'));
    routes[basicCheckout] = withProps(routes[basicCheckout], (props) => {
      props.layout.campaignDisclaimer.disclaimer = 'Pris frem til 01.12.26 er 399 kr.';
    });
    const db = createFakeDatabase();
    const { report } = await runNight(db, NIGHT_1, { routes });

    // Kampagnen gælder Basic i hele Kæden. Roskilde har Basic til 399 kr, så kun dér fejler den.
    assert.deepEqual(
      report.chains[0].failures.map((failure) => [failure.offerId, failure.problems]),
      [
        [
          'sats-434-1club-allday-nobnd-gx',
          ['Kampagnepris 399 er ikke lavere end Standardpris 399'],
        ],
      ],
    );
    const offers = db.snapshot().Offers;
    assert.equal(offers['sats-412'][BASIC_412].campaignPrice, 399);
    assert.deepEqual(Object.keys(offers['sats-434']), [
      'sats-434-region-allday-nobnd-gx',
      'sats-434-premium-nobnd',
    ]);
  });

  test('mangler Oprettelsesgebyret, fordi checkout fejlede, skrives Tilbuddene ikke', async () => {
    const routes = satsRoutes();
    const premiumCheckout = Object.keys(routes).find((url) => url.includes('PREMIUM_NOBND'));
    routes[premiumCheckout] = new Error('HTTP 503');
    const db = createFakeDatabase();
    const { ok, report } = await runNight(db, NIGHT_1, { routes });

    // 3 af 9 Tilbud (33 %) fejler → hele Kæden springes over.
    assert.equal(ok, false);
    assert.equal(report.chains[0].status, 'skipped');
    assert.deepEqual(db.snapshot(), {});
  });
});

describe('kædeniveau', () => {
  const otherChain = {
    chainId: 'test',
    scrape: async () => ({
      chain: { id: 'test', name: 'Testkæde', website: 'https://example.dk', discounts: [] },
      centers: [
        {
          id: 'test-1',
          chainId: 'test',
          name: 'Test Center',
          address: 'Vej 1, 8000 Aarhus C',
          location: { latitude: 56.1567, longitude: 10.2108 },
          facilities: {},
          signupUrl: 'https://example.dk/1',
          offers: [
            {
              id: 'test-1-a',
              name: 'A',
              subscriptionType: 'Lokal center',
              standardPrice: 199,
              signupFee: 99,
            },
          ],
        },
      ],
      readErrors: [],
    }),
  };

  test('over 20 % fejl: Kæden springes over, gamle data beholdes, jobbet fejler', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const before = db.snapshot();

    // Et Center med koordinater i Sverige gør alle dets 3 Tilbud ugyldige: 3 af 9 = 33 %.
    const routes = satsRoutes();
    routes[SATS_CENTER_LIST_URL] = withProps(centerListWith(), (props) => {
      props.clubs[2].location = { lat: 55.605, lng: 13.0038 };
    });
    routes[ADELGADE_URL] = withBasicPrice(routes[ADELGADE_URL], 499, 599);
    const { ok, report } = await runNight(db, NIGHT_2, { routes, extraScrapers: [otherChain] });

    assert.equal(ok, false);
    const [sats, test] = report.chains;
    assert.equal(sats.status, 'skipped');
    assert.equal(sats.reason, '3 af 9 fejlede (33 % > 20 %)');
    // Ingen prisændringer → ingen alarmer for en Kæde, der er sprunget over.
    assert.deepEqual(sats.priceChanges, []);

    const after = db.snapshot();
    assert.deepEqual(after.Chains.sats, before.Chains.sats);
    assert.deepEqual(after.Centers, { ...before.Centers, 'test-1': after.Centers['test-1'] });
    assert.deepEqual(after.Offers['sats-412'], before.Offers['sats-412']);
    assert.deepEqual(after.PriceHistory['sats-412'], before.PriceHistory['sats-412']);

    // Den anden Kæde skrives stadig.
    assert.equal(test.status, 'written');
    assert.equal(after.Offers['test-1']['test-1-a'].standardPrice, 199);
    assert.match(formatReport(report), /## sats: SPRUNGET OVER: 3 af 9 fejlede/);
  });

  test('0 Centre springer Kæden over', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = { ...satsRoutes(), [SATS_CENTER_LIST_URL]: centerListWith([]) };
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    assert.equal(ok, false);
    assert.equal(report.chains[0].reason, 'Kæden gav 0 Centre');
    // Ingen Centre markeres som forsvundet, når Kæden er sprunget over.
    assert.equal(db.snapshot().Centers['sats-412'].missingNights, undefined);
    assert.equal(db.updates.length, 1);
  });

  test('kan centerlisten ikke hentes, springes Kæden over', async () => {
    const routes = { ...satsRoutes(), [SATS_CENTER_LIST_URL]: new Error('HTTP 502') };
    const { ok, report } = await runNight(createFakeDatabase(), NIGHT_1, { routes });

    assert.equal(ok, false);
    assert.equal(report.chains[0].reason, 'Kæden kunne ikke hentes: HTTP 502');
  });

  test('en ændret sidestruktur (ingen data-props) springer Kæden over', async () => {
    const routes = { ...satsRoutes(), [SATS_CENTER_LIST_URL]: '<html>Ny side</html>' };
    const { ok, report } = await runNight(createFakeDatabase(), NIGHT_1, { routes });

    assert.equal(ok, false);
    assert.equal(report.chains[0].reason, 'Kæden kunne ikke hentes: Siden har ingen data-props');
  });

  test('alle centersider ændret: Kæden springes over i stedet for tomme data', async () => {
    const routes = satsRoutes();
    for (const url of Object.keys(routes)) {
      if (url.includes('/traeningscenter/')) routes[url] = '<html>Ny side</html>';
    }
    const { ok, report } = await runNight(createFakeDatabase(), NIGHT_1, { routes });

    assert.equal(ok, false);
    assert.equal(report.chains[0].reason, '3 af 3 fejlede (100 % > 20 %)');
  });

  test('et Center, der ikke kunne læses, røres ikke og tæller ikke som forsvundet', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const before = db.snapshot();
    const routes = satsRoutes();
    routes[ROSKILDE_URL] = new Error('HTTP 500');
    // Én læsefejl mod 6 gyldige Tilbud = 14 %, så Kæden skrives.
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    assert.equal(ok, true);
    assert.deepEqual(report.chains[0].failures, [
      { centerId: 'sats-434', problems: ['HTTP 500'] },
    ]);
    assert.deepEqual(report.chains[0].missing, []);
    const after = db.snapshot();
    assert.deepEqual(after.Centers['sats-434'], before.Centers['sats-434']);
    assert.deepEqual(after.Offers['sats-434'], before.Offers['sats-434']);
  });
});

describe('forsvundne Centre og Tilbud ("sidst set")', () => {
  // Første nat med en ekstra Basic-variant i Adelgade og et ekstra Center i listen.
  const firstNightRoutes = () => {
    const routes = satsRoutes();
    routes[ADELGADE_URL] = withProps(routes[ADELGADE_URL], (props) => {
      for (const view of props.becomeMemberSection.views) {
        const adult = view.segments.find((segment) => segment.id.endsWith('ADULT'));
        const extra = structuredClone(adult.memberships[0]);
        extra.id = extra.id.replace('1CLUB_ALLDAY', '1CLUB_OFFPEAK');
        extra.name = 'Off-peak';
        adult.memberships.push(extra);
      }
    });
    routes[checkoutUrlFor({ clubId: '412', membershipKey: '1CLUB_OFFPEAK_NOBND_GX' })] =
      satsFixture('checkout-basic.html');
    routes[SATS_CENTER_LIST_URL] = centerListWith(['412', '437', '434', '410']);
    routes['https://www.sats.dk/traeningscenter/kobenhavn/kbh-nygardsvej'] = withProps(
      satsFixture('center-437-helsingor.html'),
      (props) => {
        props.clubId = '410';
      },
    );
    return routes;
  };
  const OFFPEAK = 'sats-412-1club-offpeak-nobnd-gx';

  const setUp = async () => {
    const db = createFakeDatabase();
    const { report } = await runNight(db, NIGHT_1, { routes: firstNightRoutes() });
    assert.equal(report.chains[0].validOffers, 13);
    return db;
  };

  test('nat 1: Tilbud og Center beholdes med "sidst set" og 1 nat væk', async () => {
    const db = await setUp();
    const { report } = await runNight(db, NIGHT_2);
    const data = db.snapshot();

    assert.equal(data.Offers['sats-412'][OFFPEAK].lastSeen, NIGHT_1);
    assert.equal(data.Offers['sats-412'][OFFPEAK].missingNights, 1);
    assert.equal(data.Offers['sats-412'][OFFPEAK].standardPrice.over30, 649);
    assert.equal(data.Centers['sats-410'].lastSeen, NIGHT_1);
    assert.equal(data.Centers['sats-410'].missingNights, 1);
    assert.equal(Object.keys(data.Offers['sats-410']).length, 3);
    assert.deepEqual(report.chains[0].missing, [
      { centerId: 'sats-412', offerId: OFFPEAK, missingNights: 1 },
      { centerId: 'sats-410', missingNights: 1 },
    ]);
    // Det, der stadig findes, har intet missingNights.
    assert.equal(data.Offers['sats-412'][BASIC_412].missingNights, undefined);
  });

  test('nat 2: stadig beholdt, 2 nætter væk', async () => {
    const db = await setUp();
    await runNight(db, NIGHT_2);
    await runNight(db, NIGHT_3);
    const data = db.snapshot();

    assert.equal(data.Offers['sats-412'][OFFPEAK].missingNights, 2);
    assert.equal(data.Offers['sats-412'][OFFPEAK].lastSeen, NIGHT_1);
    assert.equal(data.Centers['sats-410'].missingNights, 2);
  });

  test('nat 3: fjernes, både Tilbuddet og Centret med dets Tilbud', async () => {
    const db = await setUp();
    await runNight(db, NIGHT_2);
    await runNight(db, NIGHT_3);
    const { report } = await runNight(db, NIGHT_4);
    const data = db.snapshot();

    assert.equal(data.Offers['sats-412'][OFFPEAK], undefined);
    assert.equal(data.Centers['sats-410'], undefined);
    assert.equal(data.Offers['sats-410'], undefined);
    assert.deepEqual(report.chains[0].removed, [
      { centerId: 'sats-412', offerId: OFFPEAK, missingNights: 3 },
      { centerId: 'sats-410', missingNights: 3 },
    ]);
    // Resten er urørt.
    assert.equal(Object.keys(data.Offers['sats-412']).length, 3);
    assert.deepEqual(Object.keys(data.Centers), ['sats-412', 'sats-437', 'sats-434']);
  });

  test('dukker det op igen, nulstilles tællingen', async () => {
    const db = await setUp();
    await runNight(db, NIGHT_2);
    await runNight(db, NIGHT_3, { routes: firstNightRoutes() });
    const data = db.snapshot();

    assert.equal(data.Offers['sats-412'][OFFPEAK].missingNights, undefined);
    assert.equal(data.Offers['sats-412'][OFFPEAK].lastSeen, NIGHT_3);
    assert.equal(data.Centers['sats-410'].missingNights, undefined);
  });

  test('nætter, hvor Kæden er sprunget over, tæller ikke med', async () => {
    const db = await setUp();
    await runNight(db, NIGHT_2);
    const skipped = { ...satsRoutes(), [SATS_CENTER_LIST_URL]: new Error('HTTP 502') };
    await runNight(db, NIGHT_3, { routes: skipped });

    assert.equal(db.snapshot().Offers['sats-412'][OFFPEAK].missingNights, 1);
  });

  test('håndindtastede SATS-Centre udfases efter 3 nætter, når scraperen tager over', async () => {
    const db = seededDatabase();
    await runNight(db, NIGHT_1);
    assert.equal(db.snapshot().Centers['sats-oesterbro'].missingNights, 1);
    await runNight(db, NIGHT_2);
    await runNight(db, NIGHT_3);
    const data = db.snapshot();

    assert.equal(data.Centers['sats-oesterbro'], undefined);
    assert.equal(data.Offers['sats-oesterbro'], undefined);
    assert.ok(data.Centers['puregym-oesterbro']);
  });
});

describe('dansk dato', () => {
  test('bruger dansk tid, også når UTC stadig er i går', () => {
    // 23:30 UTC den 24/10 er 01:30 den 25/10 i Danmark (sommertid).
    assert.equal(todayInDenmark(new Date('2026-10-24T23:30:00Z')), '2026-10-25');
    // Efter skift til vintertid: 02:17 UTC = 03:17 dansk tid.
    assert.equal(todayInDenmark(new Date('2026-11-02T02:17:00Z')), '2026-11-02');
  });
});
