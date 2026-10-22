// Nat-jobbet med PureGym: den rigtige PureGym-parser med gemte svar fra puregym.dk (falsk HTTP),
// sammen med SATS som en rigtig nat, og en falsk Realtime Database.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { CENTERS as SAMPLE_CENTERS, CHAINS as SAMPLE_CHAINS } from '../data/const.js';
import { buildSeedUpdate, fromDatabase } from '../data/centerData.js';
import { matchCenters } from '../data/matchning.js';
import { CHAIN_SCRAPERS, SCRAPED_CHAIN_IDS } from './chains/index.mjs';
import {
  PUREGYM_CENTER_LIST_URL,
  PUREGYM_PRICE_LIST_URL,
  PUREGYM_CHAIN,
  scrapePuregym,
} from './chains/puregym.mjs';
import { scrapeSats } from './chains/sats.mjs';
import { formatReport, runNightlyJob } from './nightlyJob.mjs';
import { createFakeDatabase } from './testing/fakeDatabase.mjs';
import {
  ajaxUrl,
  centerListWith,
  createPuregymHttp,
  formUrl,
  postKey,
  puregymRoutes,
  withStandardPrice,
} from './testing/puregymFixtures.mjs';
import { createFixtureHttp, satsRoutes } from './testing/satsFixtures.mjs';

const NIGHT_1 = '2026-10-22';
const NIGHT_2 = '2026-10-23';
const NIGHT_3 = '2026-10-24';
const NIGHT_4 = '2026-10-25';

const AARHUS = 'puregym-152';
const AARHUSGADE = 'puregym-123';
const ODENSE = 'puregym-107';
const CORE_AARHUS = `${AARHUS}-core`;

const puregymScraper = (routes, today) => ({
  chainId: 'puregym',
  scrape: () => scrapePuregym({ http: createPuregymHttp(routes), today }),
});
const satsScraper = (today) => ({
  chainId: 'sats',
  scrape: () => scrapeSats({ http: createFixtureHttp(satsRoutes()), today }),
});

// Én nat med SATS og PureGym, som den kører i GitHub Actions.
const runNight = (db, today, { routes = puregymRoutes(), dryRun } = {}) =>
  runNightlyJob({
    db,
    today,
    dryRun,
    scrapers: [satsScraper(today), puregymScraper(routes, today)],
  });

const reportFor = (report, chainId) => report.chains.find((chain) => chain.chainId === chainId);

// Ændrer normalprisen for et medlemskab uden kampagne i begge Aldersgrupper for ét Center.
function withPrices(routes, node, name, { under30, over30 }) {
  const under = postKey(ajaxUrl(node), 'under_30_submit');
  const over = postKey(ajaxUrl(node), 'over_30_submit');
  return {
    ...routes,
    [under]: withStandardPrice(routes[under], name, under30),
    [over]: withStandardPrice(routes[over], name, over30),
  };
}

const seededDatabase = () => {
  const update = buildSeedUpdate({ chains: SAMPLE_CHAINS, centers: SAMPLE_CENTERS });
  const tree = {};
  for (const [path, value] of Object.entries(update)) {
    const [root, id] = path.split('/');
    tree[root] = { ...tree[root], [id]: value };
  }
  return createFakeDatabase(tree);
};

describe('PureGym er med i nat-jobbet', () => {
  test('PureGym står på listen over Kæder, der scrapes, og seed springer den over', () => {
    assert.ok(CHAIN_SCRAPERS.some(({ chainId }) => chainId === 'puregym'));
    assert.ok(SCRAPED_CHAIN_IDS.includes('puregym'));
  });
});

describe('normal kørsel med PureGym', () => {
  test('skriver PureGym og SATS i én samlet opdatering', async () => {
    const db = createFakeDatabase();
    const { ok, report } = await runNight(db, NIGHT_1);

    assert.equal(ok, true);
    assert.equal(db.updates.length, 1);

    const data = db.snapshot();
    // Rabatterne (pr. medlemskab) står præcist i parser-testen.
    assert.deepEqual(data.Chains.puregym, PUREGYM_CHAIN);
    assert.deepEqual(
      Object.keys(data.Centers).filter((id) => id.startsWith('puregym-')),
      [AARHUS, AARHUSGADE, ODENSE],
    );
    assert.deepEqual(data.Centers[AARHUSGADE], {
      id: AARHUSGADE,
      chainId: 'puregym',
      name: 'PureGym Kbh Ø., Århusgade',
      address: 'Århusgade 102, 2100 København Ø',
      location: { latitude: 55.706711010263824, longitude: 12.587304744888911 },
      facilities: { groupClasses: true },
      signupUrl: formUrl(118),
      lastSeen: NIGHT_1,
    });
    assert.deepEqual(data.Offers[AARHUSGADE][`${AARHUSGADE}-unlimited`], {
      id: `${AARHUSGADE}-unlimited`,
      name: 'Unlimited',
      subscriptionType: 'Landsdækkende',
      standardPrice: { under30: 429, over30: 479 },
      campaignPrice: { under30: 321.75, over30: 359.25 },
      campaignMonths: 1,
      campaignEndDate: '2026-11-30',
      campaignText: 'INTROPRIS: Spar 25% frem til 30. november 2026',
      signupFee: 99,
      adminFee: 0,
      bindingMonths: 0,
      signupUrl: formUrl(118),
      lastSeen: NIGHT_1,
    });
    // Core har ingen kampagne; null gemmes ikke i Realtime Database.
    assert.equal('campaignPrice' in data.Offers[AARHUSGADE][`${AARHUSGADE}-core`], false);
    assert.deepEqual(data.PriceHistory[AARHUS][CORE_AARHUS], {
      [NIGHT_1]: { standardPrice: { under30: 269, over30: 299 } },
    });

    const puregym = reportFor(report, 'puregym');
    assert.equal(puregym.status, 'written');
    assert.equal(puregym.centersFound, 3);
    // Århus C. 4, Århusgade 2 og Odense 3 (Core og Hold kun for 30+ springes over).
    assert.equal(puregym.validOffers, 9);
    assert.deepEqual(puregym.failures, []);
    assert.deepEqual(puregym.warnings, [
      'puregym-107: Core og Hold findes kun for 30+ og springes over',
    ]);
    assert.equal(reportFor(report, 'sats').status, 'written');

    const markdown = formatReport(report);
    assert.match(markdown, /## puregym: OK/);
    const row =
      '| PureGym Kbh Ø., Århusgade | Unlimited | 429 / 479 | 321.75 / 359.25 kr i 1 md. | 99 | 0 md. |';
    assert.ok(markdown.includes(row));
    assert.ok(markdown.includes('- Advarsel: puregym-107: Core og Hold findes kun for 30+'));
  });

  describe('appen kan læse dataene og regne Ærlig årspris med Matchning', () => {
    // Én nat skrives, og databasen læses tilbage som appen gør.
    const readBack = async () => {
      const db = createFakeDatabase();
      await runNight(db, NIGHT_1);
      const { Chains, Centers, Offers } = db.snapshot();
      return fromDatabase({ chains: Chains, centers: Centers, offers: Offers });
    };
    const priceFor = async (centerId, user) => {
      const { chains, centers } = await readBack();
      const result = matchCenters({
        centers,
        chains,
        user: { currentMembership: null, ...user },
        filters: {},
        sortBy: 'honestYearlyPrice',
        location: { latitude: 55.6761, longitude: 12.5683 },
        today: NIGHT_1,
      });
      return result.centers.find((entry) => entry.center.id === centerId).bestOffer;
    };
    const round = (value) => Math.round(value * 100) / 100;

    test('uden Rabat: Core til Standardpris plus 99 kr i Oprettelsesgebyr', async () => {
      const best = await priceFor(AARHUSGADE, { birthDate: '2000-01-01', discountProfile: [] });
      // (99 + 12 × 349) / 12 = 357,25. Unlimited med intropris for under 30:
      // (99 + 321,75 + 11 × 429) / 12 = 428,31.
      assert.equal(best.offer.name, 'Core');
      assert.equal(round(best.honestYearlyPrice), 357.25);
      assert.equal(best.yearlyOption.kind, 'standard');
    });

    test('introprisen pr. Aldersgruppe: under 30 og 30+ får hver deres Kampagnepris', async () => {
      const unlimitedFor = async (birthDate) => {
        const { chains, centers } = await readBack();
        const result = matchCenters({
          centers,
          chains,
          user: { currentMembership: null, birthDate, discountProfile: [] },
          filters: {},
          location: { latitude: 55.6761, longitude: 12.5683 },
          today: NIGHT_1,
        });
        const center = result.centers.find((entry) => entry.center.id === AARHUSGADE);
        return center.offers.find((priced) => priced.offer.name === 'Unlimited');
      };
      // Under 30: (99 + 321,75 + 11 × 429) / 12 = 428,31. 30+: (99 + 359,25 + 11 × 479) / 12 =
      // 477,27.
      assert.equal(round((await unlimitedFor('2000-01-01')).honestYearlyPrice), 428.31);
      assert.equal(round((await unlimitedFor('1980-01-01')).honestYearlyPrice), 477.27);
    });

    test('Ældre Sagen: satsen afhænger af medlemskabet og giver gratis oprettelse', async () => {
      const best = await priceFor(AARHUS, {
        birthDate: '1960-01-01',
        discountProfile: ['aeldreSagen'],
      });
      // 30+ i Århus C.: Core 299 × 0,85 = 254,15; Core og Hold 349 × 0,85 = 296,65;
      // Plus 379 × 0,80 = 303,20; Unlimited 479 × 0,75 = 359,25. Ingen Oprettelsesgebyr.
      assert.equal(best.offer.name, 'Core');
      assert.equal(round(best.honestYearlyPrice), 254.15);
      assert.equal(best.signupFee, 0);
      assert.equal(best.yearlyOption.discountGroup, 'aeldreSagen');
    });

    test('Studerende: 40 % kun på Unlimited og oprettelse til 0 kr', async () => {
      const best = await priceFor(AARHUS, {
        birthDate: '2000-01-01',
        discountProfile: ['student'],
      });
      // Unlimited 429 × 0,60 = 257,40 slår Core uden Rabat: (99 + 12 × 269) / 12 = 278,25.
      assert.equal(best.offer.name, 'Unlimited');
      assert.equal(round(best.honestYearlyPrice), 257.4);
      assert.equal(best.signupFee, 0);
      assert.equal(best.yearlyOption.discountGroup, 'student');
    });

    test('Studierabatten gælder ikke Core', async () => {
      const { chains, centers } = await readBack();
      const aarhus = centers.find((center) => center.id === AARHUS);
      const core = aarhus.offers.filter((offer) => offer.name === 'Core');
      const onlyCore = { ...aarhus, offers: core };
      const result = matchCenters({
        centers: [onlyCore],
        chains,
        user: { birthDate: '2000-01-01', discountProfile: ['student'], currentMembership: null },
        filters: {},
        sortBy: 'honestYearlyPrice',
        location: { latitude: 56.15, longitude: 10.2 },
        today: NIGHT_1,
      });
      const best = result.centers[0].bestOffer;
      assert.equal(round(best.honestYearlyPrice), 277.25);
      assert.equal(best.yearlyOption.kind, 'standard');
    });
  });

  test('anden nat med samme priser: ingen ændringer, nyt "sidst set" og ny historik', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const { report } = await runNight(db, NIGHT_2);

    const puregym = reportFor(report, 'puregym');
    assert.deepEqual(puregym.priceChanges, []);
    assert.deepEqual(puregym.newOffers, []);
    const data = db.snapshot();
    assert.equal(data.Offers[AARHUS][CORE_AARHUS].lastSeen, NIGHT_2);
    assert.deepEqual(Object.keys(data.PriceHistory[AARHUS][CORE_AARHUS]), [NIGHT_1, NIGHT_2]);
  });

  test('et prisfald står i rapporten (grundlag for Prisalarmer) og skrives', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = withPrices(puregymRoutes(), 45, 'Core', { under30: 249, over30: 279 });
    const { report } = await runNight(db, NIGHT_2, { routes });

    assert.deepEqual(reportFor(report, 'puregym').priceChanges, [
      {
        centerId: AARHUS,
        offerId: CORE_AARHUS,
        before: { standardPrice: { under30: 269, over30: 299 }, campaignPrice: null },
        after: { standardPrice: { under30: 249, over30: 279 }, campaignPrice: null },
      },
    ]);
    assert.deepEqual(db.snapshot().Offers[AARHUS][CORE_AARHUS].standardPrice, {
      under30: 249,
      over30: 279,
    });
  });

  test('en tør kørsel skriver intet', async () => {
    const db = createFakeDatabase();
    const { ok, update } = await runNight(db, NIGHT_1, { dryRun: true });
    assert.equal(ok, true);
    assert.equal(db.updates.length, 0);
    assert.ok(update[`Offers/${AARHUS}/${CORE_AARHUS}`]);
  });
});

describe('sanity-fejl hos PureGym', () => {
  test('en prisændring over 50 % på én nat skrives ikke; gamle data beholdes', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = withPrices(puregymRoutes(), 45, 'Core', { under30: 99, over30: 299 });
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    // 1 af 9 Tilbud fejler (11 %), så Kæden skrives stadig.
    assert.equal(ok, true);
    const puregym = reportFor(report, 'puregym');
    assert.deepEqual(puregym.failures, [
      {
        centerId: AARHUS,
        offerId: CORE_AARHUS,
        problems: ['Standardpris (under30) ændret -63 % på én nat (269 → 99 kr/md)'],
      },
    ]);
    assert.deepEqual(puregym.priceChanges, []);
    const core = db.snapshot().Offers[AARHUS][CORE_AARHUS];
    assert.deepEqual(core.standardPrice, { under30: 269, over30: 299 });
    assert.equal(core.lastSeen, NIGHT_1);
  });

  test('uden prisliste mangler alle Tilbud Oprettelsesgebyr; PureGym springes over', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const before = db.snapshot();
    const routes = { ...puregymRoutes(), [PUREGYM_PRICE_LIST_URL]: new Error('HTTP 503') };
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    assert.equal(ok, false);
    const puregym = reportFor(report, 'puregym');
    assert.equal(puregym.status, 'skipped');
    assert.equal(puregym.reason, '9 af 9 fejlede (100 % > 20 %)');
    assert.deepEqual(puregym.priceChanges, []);
    assert.equal(puregym.failures[0].problems[0], 'Tilbuddet mangler Oprettelsesgebyr');

    // PureGyms gamle data er urørte; SATS er stadig skrevet.
    const after = db.snapshot();
    assert.deepEqual(after.Chains.puregym, before.Chains.puregym);
    assert.deepEqual(after.Offers[AARHUS], before.Offers[AARHUS]);
    assert.deepEqual(after.Centers[ODENSE], before.Centers[ODENSE]);
    assert.equal(reportFor(report, 'sats').status, 'written');
    assert.equal(after.Offers['sats-412']['sats-412-1club-allday-nobnd-gx'].lastSeen, NIGHT_2);
    assert.match(formatReport(report), /## puregym: SPRUNGET OVER: 9 af 9 fejlede/);
  });
});

describe('kædeniveau for PureGym', () => {
  test('nyt formularflow overalt: PureGym springes over i stedet for tomme data', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const before = db.snapshot();
    const routes = puregymRoutes();
    for (const node of [45, 118, 146]) routes[formUrl(node)] = '<html>Ny side</html>';
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    assert.equal(ok, false);
    const puregym = reportFor(report, 'puregym');
    assert.equal(puregym.reason, '3 af 3 fejlede (100 % > 20 %)');
    assert.deepEqual(puregym.missing, []);
    assert.deepEqual(db.snapshot().Offers[AARHUSGADE], before.Offers[AARHUSGADE]);
  });

  test('kan centerlisten ikke hentes, springes PureGym over, men SATS skrives', async () => {
    const routes = { ...puregymRoutes(), [PUREGYM_CENTER_LIST_URL]: new Error('HTTP 502') };
    const db = createFakeDatabase();
    const { ok, report } = await runNight(db, NIGHT_1, { routes });

    assert.equal(ok, false);
    assert.equal(reportFor(report, 'puregym').reason, 'Kæden kunne ikke hentes: HTTP 502');
    assert.equal(reportFor(report, 'sats').status, 'written');
    assert.equal(db.snapshot().Chains.puregym, undefined);
  });

  test('ét Center, der ikke kan læses, røres ikke og tæller ikke som forsvundet', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const before = db.snapshot();
    const routes = puregymRoutes();
    routes[postKey(ajaxUrl(118), 'over_30_submit')] = new Error('HTTP 500');
    // Én læsefejl mod 7 gyldige Tilbud = 12,5 %, så Kæden skrives.
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    assert.equal(ok, true);
    const puregym = reportFor(report, 'puregym');
    assert.deepEqual(puregym.failures, [{ centerId: AARHUSGADE, problems: ['HTTP 500'] }]);
    assert.deepEqual(puregym.missing, []);
    const after = db.snapshot();
    assert.deepEqual(after.Centers[AARHUSGADE], before.Centers[AARHUSGADE]);
    assert.deepEqual(after.Offers[AARHUSGADE], before.Offers[AARHUSGADE]);
  });
});

describe('forsvundne PureGym-Centre ("sidst set")', () => {
  const withoutOdense = () => ({
    ...puregymRoutes(),
    [PUREGYM_CENTER_LIST_URL]: centerListWith(['45', '118']),
  });

  test('nat 1 og 2 beholdes Centret; nat 3 fjernes det med dets Tilbud', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);

    await runNight(db, NIGHT_2, { routes: withoutOdense() });
    let data = db.snapshot();
    assert.equal(data.Centers[ODENSE].missingNights, 1);
    assert.equal(data.Centers[ODENSE].lastSeen, NIGHT_1);
    assert.equal(Object.keys(data.Offers[ODENSE]).length, 3);

    await runNight(db, NIGHT_3, { routes: withoutOdense() });
    assert.equal(db.snapshot().Centers[ODENSE].missingNights, 2);

    const { report } = await runNight(db, NIGHT_4, { routes: withoutOdense() });
    data = db.snapshot();
    assert.equal(data.Centers[ODENSE], undefined);
    assert.equal(data.Offers[ODENSE], undefined);
    assert.deepEqual(reportFor(report, 'puregym').removed, [
      { centerId: ODENSE, missingNights: 3 },
    ]);
    assert.ok(data.Centers[AARHUS]);
  });

  test('håndindtastede PureGym-Centre udfases efter 3 nætter med scraperen', async () => {
    const db = seededDatabase();
    await runNight(db, NIGHT_1);
    assert.equal(db.snapshot().Centers['puregym-oesterbro'].missingNights, 1);
    // Den håndindtastede Kæde overskrives straks med de rigtige Rabatter.
    assert.equal(db.snapshot().Chains.puregym.discounts.length, 4);
    await runNight(db, NIGHT_2);
    await runNight(db, NIGHT_3);
    const data = db.snapshot();

    assert.equal(data.Centers['puregym-oesterbro'], undefined);
    assert.equal(data.Offers['puregym-noerrebro'], undefined);
    assert.ok(data.Centers[AARHUS]);
    // Andre håndindtastede Kæder røres ikke.
    assert.ok(data.Centers['loop-valby']);
  });
});
