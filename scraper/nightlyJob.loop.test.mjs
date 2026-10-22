// Nat-jobbet end-to-end med LOOP: den rigtige LOOP-parser med gemte svar fra loopfitness.dk
// (falsk HTTP) og en falsk Realtime Database. Til sidst læser appens egen kode (centerData og
// Matchning) de skrevne data og regner Ærlig årspris med betaling pr. 30 dage.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { CENTERS as SAMPLE_CENTERS, CHAINS as SAMPLE_CHAINS } from '../data/const.js';
import { buildSeedUpdate, fromDatabase } from '../data/centerData.js';
import { matchCenters } from '../data/matchning.js';
import { CHAIN_SCRAPERS, SCRAPED_CHAIN_IDS } from './chains/index.mjs';
import { LOOP_CENTER_LIST_URL, LOOP_PRICES_URL, scrapeLoop } from './chains/loop.mjs';
import { scrapeSats } from './chains/sats.mjs';
import { formatReport, runNightlyJob } from './nightlyJob.mjs';
import { createFakeDatabase } from './testing/fakeDatabase.mjs';
import {
  centerListWith,
  createFixtureHttp,
  locationById,
  loopFixture,
  loopRoutes,
  withLocations,
} from './testing/loopFixtures.mjs';
import { satsRoutes } from './testing/satsFixtures.mjs';

const NIGHT_1 = '2026-10-22';
const NIGHT_2 = '2026-10-23';
const NIGHT_3 = '2026-10-24';
const NIGHT_4 = '2026-10-25';

const ALL_LOOP_IDS = [145, 119, 232, 221, 143, 193, 114, 220, 1];
const VOKSEN_145 = 'loop-145-voksen';

const loopScraper = (routes = loopRoutes(), today = NIGHT_1) => ({
  chainId: 'loop',
  scrape: () => scrapeLoop({ http: createFixtureHttp(routes), today }),
});

const runNight = (db, today, { routes, dryRun } = {}) =>
  runNightlyJob({ db, today, dryRun, scrapers: [loopScraper(routes, today)] });

// Ændrer centerlisten (rigtige data) for én kørsel.
const listRoutes = (mutate) => {
  const routes = loopRoutes();
  routes[LOOP_CENTER_LIST_URL] = withLocations(routes[LOOP_CENTER_LIST_URL], mutate);
  return routes;
};

const voksenGroup = (location) =>
  location.public_groups.find((group) => group.name === 'Kampagne: 100 kr. resten af året');

const seededDatabase = () => {
  const update = buildSeedUpdate({ chains: SAMPLE_CHAINS, centers: SAMPLE_CENTERS });
  const tree = {};
  for (const [path, value] of Object.entries(update)) {
    const [root, id] = path.split('/');
    tree[root] = { ...tree[root], [id]: value };
  }
  return createFakeDatabase(tree);
};

// Ærlig årspris for ét Center og én bruger med appens egen Matchning.
function matchFor(db, { centerId, discountProfile = [], today = NIGHT_1 }) {
  const { Chains, Centers, Offers } = db.snapshot();
  const { chains, centers } = fromDatabase({ chains: Chains, centers: Centers, offers: Offers });
  const result = matchCenters({
    centers,
    chains,
    user: { birthDate: '1990-05-01', discountProfile, currentMembership: null },
    filters: {},
    sortBy: 'honestYearlyPrice',
    location: { latitude: 55.6761, longitude: 12.5683 },
    today,
  });
  return result.centers.find((entry) => entry.center.id === centerId);
}

const kr = (amount) => Math.round(amount * 100) / 100;

describe('LOOP i nat-jobbet', () => {
  test('LOOP står i kæde-registret, så nat-jobbet scraper den, og seed springer den over', () => {
    assert.ok(CHAIN_SCRAPERS.some(({ chainId }) => chainId === 'loop'));
    assert.ok(SCRAPED_CHAIN_IDS.includes('loop'));
  });

  test('skriver Kæde, Centre, Tilbud og prishistorik i én samlet opdatering', async () => {
    const db = createFakeDatabase();
    const { ok, report } = await runNight(db, NIGHT_1);

    assert.equal(ok, true);
    assert.equal(db.updates.length, 1);
    const data = db.snapshot();

    assert.deepEqual(data.Chains.loop, {
      id: 'loop',
      name: 'LOOP Fitness',
      website: 'https://loopfitness.dk',
      discounts: [
        { discountGroup: 'student', percentOff: 15, offerNames: ['Voksen'], signupFee: 199 },
        { discountGroup: 'aeldreSagen', percentOff: 15, offerNames: ['Voksen'], signupFee: 199 },
      ],
    });
    assert.equal(Object.keys(data.Centers).length, 9);
    assert.deepEqual(data.Centers['loop-145'], {
      id: 'loop-145',
      chainId: 'loop',
      name: 'LOOP Aabenraa',
      address: 'Møllemærsk 24, 6200 Aabenraa',
      location: { latitude: 55.039541, longitude: 9.420585 },
      facilities: { groupClasses: false, open24h: false },
      signupUrl: 'https://loopfitness.dk/centre/loop-fitness-aabenraa/',
      lastSeen: NIGHT_1,
    });
    // partnerPrice null skrives ikke (RTDB gemmer ikke null), resten er med.
    assert.deepEqual(data.Offers['loop-145'][VOKSEN_145], {
      id: VOKSEN_145,
      name: 'Voksen',
      subscriptionType: 'Landsdækkende',
      standardPrice: 289,
      campaignPrice: 50,
      campaignMonths: 2,
      campaignEndDate: '2026-12-31',
      campaignText: 'Kampagne: 100 kr. resten af året',
      signupFee: 0,
      adminFee: 10,
      bindingMonths: 0,
      billingIntervalDays: 30,
      partnerPrice: 289.5,
      partnerRequirement:
        'I skal bo i samme husstand og deler ét familiemedlemskab til 589 kr + 10 kr i ' +
        'Admingebyr pr. 30 dage.',
      signupUrl:
        'https://loopfitness.dk/medlemskab/bliv-medlem?center=145' +
        '&subscription=Kampagne%3A+100+kr.+resten+af+%C3%A5ret',
      lastSeen: NIGHT_1,
    });
    assert.equal(data.Offers['loop-143']['loop-143-holdtraening'].partnerPrice, undefined);
    assert.deepEqual(data.PriceHistory['loop-145'][VOKSEN_145], {
      [NIGHT_1]: { standardPrice: 289, campaignPrice: 50 },
    });

    const [loop] = report.chains;
    assert.equal(loop.status, 'written');
    assert.equal(loop.centersFound, 9);
    // 9 × Voksen + Nibe 2 + Skagen 2 + Viborg 1.
    assert.equal(loop.validOffers, 14);
    assert.deepEqual(loop.failures, []);
    assert.deepEqual(loop.warnings, []);

    const markdown = formatReport(report);
    assert.match(markdown, /## loop: OK/);
    assert.ok(markdown.includes('| LOOP Aabenraa | Voksen | 289 | 50 kr i 2 md. | 0 | 0 md. |'));
  });

  test('SATS og LOOP skrives i samme nat uden at røre hinanden', async () => {
    const db = createFakeDatabase();
    const { ok, report } = await runNightlyJob({
      db,
      today: NIGHT_1,
      scrapers: [
        {
          chainId: 'sats',
          scrape: () => scrapeSats({ http: createFixtureHttp(satsRoutes()), today: NIGHT_1 }),
        },
        loopScraper(),
      ],
    });

    assert.equal(ok, true);
    assert.deepEqual(report.chains.map((chain) => [chain.chainId, chain.status]), [
      ['sats', 'written'],
      ['loop', 'written'],
    ]);
    assert.deepEqual(Object.keys(db.snapshot().Chains), ['sats', 'loop']);
    assert.equal(Object.keys(db.snapshot().Centers).length, 3 + 9);
  });

  test('håndindtastede LOOP-Centre udfases efter 3 nætter; andre Kæder røres ikke', async () => {
    const db = seededDatabase();
    const before = db.snapshot();
    await runNight(db, NIGHT_1);
    assert.equal(db.snapshot().Centers['loop-valby'].missingNights, 1);
    await runNight(db, NIGHT_2);
    await runNight(db, NIGHT_3);
    const data = db.snapshot();

    assert.equal(data.Centers['loop-valby'], undefined);
    assert.equal(data.Offers['loop-hvidovre'], undefined);
    assert.ok(data.Centers['loop-145']);
    assert.deepEqual(data.Centers['sats-oesterbro'], before.Centers['sats-oesterbro']);
    assert.deepEqual(data.Offers['puregym-oesterbro'], before.Offers['puregym-oesterbro']);
  });
});

describe('Ærlig årspris for LOOP med appens Matchning', () => {
  test('betaling pr. 30 dage: 365 / 30 betalinger, kampagnen de første to perioder', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const aabenraa = matchFor(db, { centerId: 'loop-145' });
    const voksen = aabenraa.bestOffer;

    assert.equal(voksen.yearlyOption.kind, 'campaign');
    assert.equal(voksen.paymentsPerYear, 365 / 30);
    assert.equal(voksen.monthlyBreakdown.length, 13);
    assert.deepEqual(
      voksen.monthlyBreakdown.slice(0, 3).map((period) => period.total),
      [60, 60, 299],
    );
    // 2 × (50 + 10) + 10 × 299 + 1/6 × 299 (den sidste delvise betaling) = 3159,83 kr / 12.
    assert.equal(kr(aabenraa.honestYearlyPrice), 263.32);
  });

  test('efter kampagnen er studierabatten billigst for en studerende', async () => {
    // Samme side, men kampagnen til og med 31/12 er udløbet den 5/1.
    const after = '2027-01-05';
    const db = createFakeDatabase();
    await runNight(db, after);

    const standard = matchFor(db, { centerId: 'loop-145', today: after });
    assert.equal(standard.bestOffer.yearlyOption.kind, 'standard');
    // 365/30 × 299 kr / 12.
    assert.equal(kr(standard.honestYearlyPrice), 303.15);

    const student = matchFor(db, {
      centerId: 'loop-145',
      discountProfile: ['student'],
      today: after,
    });
    assert.equal(student.bestOffer.yearlyOption.discountGroup, 'student');
    // (199 + 365/30 × (245,65 + 10)) / 12.
    assert.equal(kr(student.honestYearlyPrice), 275.78);
  });

  test('Makkerpris 299,50 kr pr. person: for to er familien ikke billigere', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const aabenraa = matchFor(db, { centerId: 'loop-145', discountProfile: ['partner'] });
    assert.notEqual(aabenraa.bestOffer.yearlyOption.kind, 'partner');

    // I Skagen er ALL IN FAMILY (649 + 10) / 2 = 329,50 kr pr. person mod 359 kr alene.
    const skagen = matchFor(db, { centerId: 'loop-114', discountProfile: ['partner'] });
    const allIn = skagen.offers.find((offer) => offer.offer.name === 'ALL IN (DS, LOOP & HOLD)');
    assert.equal(allIn.yearlyOption.kind, 'partner');
    assert.equal(allIn.monthlyBreakdown[0].total, 329.5);
    assert.match(allIn.partnerRequirement, /samme husstand/);
  });
});

describe('LOOP over flere nætter', () => {
  test('kampagnen udløber: samme Tilbud, ny pris i rapporten og prishistorikken', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const { report } = await runNight(db, '2026-12-05');

    const change = report.chains[0].priceChanges.find((entry) => entry.offerId === VOKSEN_145);
    assert.deepEqual(change, {
      centerId: 'loop-145',
      offerId: VOKSEN_145,
      before: { standardPrice: 289, campaignPrice: 50 },
      after: { standardPrice: 289, campaignPrice: null },
    });
    const data = db.snapshot();
    const offer = data.Offers['loop-145'][VOKSEN_145];
    assert.equal(offer.campaignPrice, undefined);
    assert.equal(offer.campaignMonths, 0);
    assert.deepEqual(data.PriceHistory['loop-145'][VOKSEN_145], {
      [NIGHT_1]: { standardPrice: 289, campaignPrice: 50 },
      '2026-12-05': { standardPrice: 289 },
    });
  });

  test('et Center, der forsvinder fra listen, beholdes i 2 nætter og fjernes den 3.', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const withoutValby = loopRoutes();
    withoutValby[LOOP_CENTER_LIST_URL] = centerListWith(ALL_LOOP_IDS.filter((id) => id !== 220));

    await runNight(db, NIGHT_2, { routes: withoutValby });
    assert.equal(db.snapshot().Centers['loop-220'].missingNights, 1);
    assert.equal(db.snapshot().Centers['loop-220'].lastSeen, NIGHT_1);
    await runNight(db, NIGHT_3, { routes: withoutValby });
    assert.equal(db.snapshot().Centers['loop-220'].missingNights, 2);
    const { report } = await runNight(db, NIGHT_4, { routes: withoutValby });

    assert.equal(db.snapshot().Centers['loop-220'], undefined);
    assert.equal(db.snapshot().Offers['loop-220'], undefined);
    assert.deepEqual(report.chains[0].removed, [{ centerId: 'loop-220', missingNights: 3 }]);
  });
});

describe('LOOP sanity- og kædefejl', () => {
  test('en prisændring over 50 % på én nat skrives ikke; resten af Kæden skrives', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = listRoutes((locations) => {
      voksenGroup(locationById(locations, 220)).price = '589.0';
    });
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    // 1 af 14 Tilbud fejler (7 %).
    assert.equal(ok, true);
    assert.deepEqual(report.chains[0].failures, [
      {
        centerId: 'loop-220',
        offerId: 'loop-220-voksen',
        problems: ['Standardpris (single) ændret 104 % på én nat (289 → 589 kr/md)'],
      },
    ]);
    const data = db.snapshot();
    assert.equal(data.Offers['loop-220']['loop-220-voksen'].standardPrice, 289);
    assert.equal(data.Offers['loop-220']['loop-220-voksen'].lastSeen, NIGHT_1);
    assert.equal(data.Offers['loop-145'][VOKSEN_145].lastSeen, NIGHT_2);
  });

  test('over 20 % fejl (Centre uden for Danmark): Kæden springes over', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const before = db.snapshot();
    // Fire Centre flyttet til Flensborg: 4 af 14 Tilbud = 29 %.
    const routes = listRoutes((locations) => {
      for (const id of [145, 119, 232, 221]) {
        Object.assign(locationById(locations, id), { lat: '54.7833', lng: '9.4333' });
      }
      voksenGroup(locationById(locations, 220)).price = '299.0';
    });
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    assert.equal(ok, false);
    assert.equal(report.chains[0].status, 'skipped');
    assert.equal(report.chains[0].reason, '4 af 14 fejlede (29 % > 20 %)');
    assert.deepEqual(report.chains[0].priceChanges, []);
    const after = db.snapshot();
    assert.deepEqual(after.Centers, before.Centers);
    assert.deepEqual(after.Offers, before.Offers);
  });

  test('kan prissiden ikke hentes, springes Kæden over, og intet skrives', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const before = db.snapshot();
    const routes = { ...loopRoutes(), [LOOP_PRICES_URL]: new Error('HTTP 503') };
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    assert.equal(ok, false);
    assert.equal(report.chains[0].reason, 'Kæden kunne ikke hentes: HTTP 503');
    assert.deepEqual(db.snapshot(), before);
  });

  test('en ændret centerliste (ingen var locations) springer Kæden over', async () => {
    const routes = { ...loopRoutes(), [LOOP_CENTER_LIST_URL]: loopFixture('priser.html') };
    const { ok, report } = await runNight(createFakeDatabase(), NIGHT_1, { routes });

    assert.equal(ok, false);
    assert.equal(
      report.chains[0].reason,
      'Kæden kunne ikke hentes: Centerlisten har ingen var locations',
    );
  });

  test('0 Centre springer Kæden over og markerer intet som forsvundet', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = { ...loopRoutes(), [LOOP_CENTER_LIST_URL]: centerListWith([]) };
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    assert.equal(ok, false);
    assert.equal(report.chains[0].reason, 'Kæden gav 0 Centre');
    assert.equal(db.snapshot().Centers['loop-145'].missingNights, undefined);
  });

  test('et Center uden abonnementer røres ikke og tæller ikke som forsvundet', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const before = db.snapshot();
    const routes = listRoutes((locations) => {
      const valby = locationById(locations, 220);
      valby.public_groups = valby.public_groups.filter((group) => group.payment_type === 'instant');
    });
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    assert.equal(ok, true);
    assert.deepEqual(report.chains[0].failures, [
      { centerId: 'loop-220', problems: ['Centret har ingen abonnementer'] },
    ]);
    assert.deepEqual(report.chains[0].missing, []);
    assert.deepEqual(db.snapshot().Offers['loop-220'], before.Offers['loop-220']);
  });
});
