// Nat-jobbet end-to-end med Fitness X: den rigtige parser med gemte svar fra fitnessx.dk (falsk
// HTTP) og en falsk Realtime Database. Sammen med SATS, så en nat med flere Kæder også er dækket.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { CENTERS as SAMPLE_CENTERS, CHAINS as SAMPLE_CHAINS } from '../data/const.js';
import { buildSeedUpdate, fromDatabase } from '../data/centerData.js';
import { matchCenters } from '../data/matchning.js';
import {
  FITNESSX_CENTER_LIST_URL,
  FITNESSX_SIGNUP_URL,
  scrapeFitnessx,
} from './chains/fitnessx.mjs';
import { scrapeSats } from './chains/sats.mjs';
import { formatReport, runNightlyJob } from './nightlyJob.mjs';
import { createFakeDatabase } from './testing/fakeDatabase.mjs';
import {
  FIXTURE_CENTERS,
  GUIDS,
  centerListWith,
  fitnessxRoutes,
  membershipsTitled,
  withAjaxObject,
  withoutCenterLink,
} from './testing/fitnessxFixtures.mjs';
import { createFixtureHttp, satsRoutes } from './testing/satsFixtures.mjs';

const NIGHT_1 = '2026-10-22';
const NIGHT_2 = '2026-10-23';
const NIGHT_3 = '2026-10-24';
const NIGHT_4 = '2026-10-25';

const VIBORG_URL = FIXTURE_CENTERS.Viborg.url;
const LINDGREENS_URL = FIXTURE_CENTERS['København S, Lindgreens Allé'].url;
const VIBORG = 'fitnessx-viborg';
const VIBORG_KAT_1 = 'fitnessx-viborg-kategori-1';
const VIBORG_KAT_2 = 'fitnessx-viborg-kategori-2';
const COPENHAGEN = { latitude: 55.6761, longitude: 12.5683 };

// Tilmeldingslinket til ét medlemskab i Viborg, som centersidens "Vælg"-knap laver det.
const viborgSignupLink = (product, vatGroup) =>
  `https://fitnessx.dk/tilmelding/?location=${GUIDS.viborg}&product=${product}` +
  `&urlreferrer=${encodeURIComponent(new URL(VIBORG_URL).pathname)}&vat_group=${vatGroup}`;

const fitnessxScraper = (routes = fitnessxRoutes(), today = NIGHT_1) => ({
  chainId: 'fitnessx',
  scrape: () => scrapeFitnessx({ http: createFixtureHttp(routes), today }),
});

const satsScraper = (today = NIGHT_1) => ({
  chainId: 'sats',
  scrape: () => scrapeSats({ http: createFixtureHttp(satsRoutes()), today }),
});

const runNight = (db, today, { routes, withSats = false, dryRun } = {}) =>
  runNightlyJob({
    db,
    today,
    dryRun,
    scrapers: [...(withSats ? [satsScraper(today)] : []), fitnessxScraper(routes, today)],
  });

// Ændrer acf.pris for de medlemskaber på Viborgs side, hvis titel matcher.
const withViborgPrice = (routes, titlePattern, price) => {
  routes[VIBORG_URL] = withAjaxObject(routes[VIBORG_URL], (ajaxObject) => {
    for (const membership of membershipsTitled(ajaxObject, titlePattern)) {
      membership.acf.pris = String(price(Number(membership.acf.pris)));
    }
  });
  return routes;
};

// Slår de rigtige åbningstilbud for Lindgreens Allé til (på siden står de med skrald i centre).
const withLindgreensOpeningOffers = (routes, drops = /Drop 3/) => {
  routes[LINDGREENS_URL] = withAjaxObject(routes[LINDGREENS_URL], (ajaxObject) => {
    for (const membership of membershipsTitled(ajaxObject, /Åbningstilbud.*Lindgreens/)) {
      if (drops.test(membership.title)) membership.acf.centre = [GUIDS.lindgreens];
    }
  });
  return routes;
};

const seededDatabase = () => {
  const update = buildSeedUpdate({ chains: SAMPLE_CHAINS, centers: SAMPLE_CENTERS });
  const tree = {};
  for (const [path, value] of Object.entries(update)) {
    const [root, id] = path.split('/');
    tree[root] = { ...tree[root], [id]: value };
  }
  return createFakeDatabase(tree);
};

const honestYearlyPrices = (db, user, centerId) => {
  const { Chains, Centers, Offers } = db.snapshot();
  const { chains, centers } = fromDatabase({ chains: Chains, centers: Centers, offers: Offers });
  const result = matchCenters({
    centers,
    chains,
    user: { currentMembership: null, ...user },
    filters: {},
    sortBy: 'honestYearlyPrice',
    location: COPENHAGEN,
    today: NIGHT_1,
  });
  return result.centers.find((entry) => entry.center.id === centerId);
};

const round2 = (value) => Math.round(value * 100) / 100;

describe('Fitness X i nat-jobbet: normal kørsel', () => {
  test('SATS og Fitness X skrives sammen i én samlet opdatering', async () => {
    const db = createFakeDatabase();
    const { ok, report } = await runNight(db, NIGHT_1, { withSats: true });

    assert.equal(ok, true);
    assert.equal(db.updates.length, 1);
    assert.deepEqual(
      report.chains.map((chain) => [chain.chainId, chain.status, chain.validOffers]),
      [
        ['sats', 'written', 9],
        ['fitnessx', 'written', 15],
      ],
    );

    const data = db.snapshot();
    assert.deepEqual(Object.keys(data.Chains), ['sats', 'fitnessx']);
    // RTDB gemmer ikke tomme lister; Fitness X har ingen Rabatter på Kæden.
    assert.deepEqual(data.Chains.fitnessx, {
      id: 'fitnessx',
      name: 'Fitness X',
      website: 'https://fitnessx.dk',
    });
    assert.deepEqual(data.Centers[VIBORG], {
      id: VIBORG,
      chainId: 'fitnessx',
      name: 'Fitness X Viborg',
      address: 'Tingvej 7, 8800 Viborg',
      location: { latitude: 56.45512941118191, longitude: 9.402475098967916 },
      facilities: { groupClasses: true, open24h: false },
      signupUrl: VIBORG_URL,
      lastSeen: NIGHT_1,
    });
    assert.deepEqual(data.Offers[VIBORG][VIBORG_KAT_2], {
      id: VIBORG_KAT_2,
      name: 'Kategori 2',
      subscriptionType: 'Landsdækkende',
      standardPrice: { under30: 360, over30: 400 },
      campaignMonths: 0,
      signupFee: 60,
      adminFee: 15,
      bindingMonths: 0,
      partnerPrice: { under30: 280, over30: 300 },
      partnerSignupFee: 80,
      partnerRequirement:
        'I melder jer ind sammen og betaler samlet 560 kr/md (under 30) eller ' +
        '600 kr/md (30+). Det koster 100 kr én gang at tilføje makkeren. ' +
        'I får begge adgang til 31 Centre.',
      // Direkte til medlemskabet (og Træningsven-medlemskabet) i Viborg pr. Aldersgruppe.
      signupUrl: {
        under30: viborgSignupLink(34727, 'under_thiry'),
        over30: viborgSignupLink(34726, 'over_thirty'),
      },
      partnerSignupUrl: {
        under30: viborgSignupLink(36058, 'under_thiry'),
        over30: viborgSignupLink(36057, 'over_thirty'),
      },
      lastSeen: NIGHT_1,
    });
    assert.deepEqual(data.PriceHistory[VIBORG][VIBORG_KAT_1], {
      [NIGHT_1]: {
        standardPrice: { under30: 400, over30: 450 },
        partnerPrice: { under30: 300, over30: 325 },
      },
    });
    // Hjørring uden link: skrevet med Kædens tilmeldingsside.
    assert.equal(data.Centers['fitnessx-hjoerring'].signupUrl, FITNESSX_SIGNUP_URL);
    assert.deepEqual(
      data.Offers['fitnessx-hjoerring']['fitnessx-hjoerring-kategori-5-traeningsven'].partnerPrice,
      { under30: 150, over30: 175 },
    );

    const markdown = formatReport(report);
    assert.match(markdown, /## fitnessx: OK/);
    assert.ok(markdown.includes('| Fitness X Viborg | Kategori 2 | 360 / 400 | – | 60 | 0 md. |'));
  });

  test('appen beregner Ærlig årspris med Aldersgruppe og Makkerpris ud fra dataene', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);

    // 26 år: Kategori 2 til 360 kr + 15 kr Admingebyr i 12 måneder + 60 kr Oprettelsesgebyr
    // = (12 × 375 + 60) / 12 = 380.
    const young = honestYearlyPrices(db, { birthDate: '2000-01-01', discountProfile: [] }, VIBORG);
    assert.equal(young.bestOffer.offer.name, 'Kategori 2');
    assert.equal(round2(young.honestYearlyPrice), 380);

    // Fylder 30 den 15/12: 1 måned til 360 kr, derefter 11 måneder til 400 kr.
    // (375 + 11 × 415 + 60) / 12 = 5000 / 12 = 416,67.
    const turns30 = honestYearlyPrices(
      db,
      { birthDate: '1996-12-15', discountProfile: [] },
      VIBORG,
    );
    assert.equal(round2(turns30.honestYearlyPrice), 416.67);

    // Træn med en makker, under 30: Makkerpris 280 kr pr. person (Kategori 2) og
    // Oprettelsesgebyr (60 + 100 for makkeren) / 2 = 80 kr pr. person.
    // (12 × (280 + 15) + 80) / 12 = 3620 / 12 = 301,67.
    const partner = honestYearlyPrices(
      db,
      { birthDate: '2000-01-01', discountProfile: ['partner'] },
      VIBORG,
    );
    assert.equal(partner.bestOffer.offer.name, 'Kategori 2');
    assert.equal(partner.bestOffer.yearlyOption.kind, 'partner');
    assert.equal(round2(partner.honestYearlyPrice), 301.67);
    assert.equal(partner.bestOffer.signupFee, 80);

    // 30+: Makkerpris 300 kr pr. person. (12 × (300 + 15) + 80) / 12 = 3860 / 12 = 321,67.
    const olderPartner = honestYearlyPrices(
      db,
      { birthDate: '1980-01-01', discountProfile: ['partner'] },
      VIBORG,
    );
    assert.equal(round2(olderPartner.honestYearlyPrice), 321.67);
  });

  test('en kampagne i fri tekst skrives og giver lavere Ærlig årspris', async () => {
    const db = createFakeDatabase();
    const routes = withLindgreensOpeningOffers(fitnessxRoutes());
    const { ok } = await runNight(db, NIGHT_1, { routes });
    assert.equal(ok, true);

    const offer = db.snapshot().Offers['fitnessx-koebenhavn-s-lindgreens-alle'][
      'fitnessx-koebenhavn-s-lindgreens-alle-aabningstilbud-drop-3'
    ];
    assert.equal(offer.campaignPrice, 189);
    assert.equal(offer.campaignMonths, 2);
    assert.equal(offer.campaignEndDate, '2026-12-31');
    assert.equal(offer.subscriptionType, 'Lokal center');

    // Under 30: 2 × (189 + 15) + 10 × (360 + 15) + 60 = 4218 → 351,50 pr. måned.
    const result = honestYearlyPrices(
      db,
      { birthDate: '2000-01-01', discountProfile: [] },
      'fitnessx-koebenhavn-s-lindgreens-alle',
    );
    assert.equal(result.bestOffer.offer.name, 'Åbningstilbud – Drop 3');
    assert.equal(round2(result.honestYearlyPrice), 351.5);
  });

  test('anden nat med en lille prisstigning: skrives og står som prisændring', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = withViborgPrice(fitnessxRoutes(), /^Kategori 1 [UO]\/30/, (price) => price + 20);
    const { report } = await runNight(db, NIGHT_2, { routes });

    const [fitnessx] = report.chains;
    assert.deepEqual(
      fitnessx.priceChanges.filter((change) => change.centerId === VIBORG),
      [
        {
          centerId: VIBORG,
          offerId: VIBORG_KAT_1,
          before: {
            standardPrice: { under30: 400, over30: 450 },
            campaignPrice: null,
            partnerPrice: { under30: 300, over30: 325 },
            partnerCampaignPrice: null,
          },
          after: {
            standardPrice: { under30: 420, over30: 470 },
            campaignPrice: null,
            partnerPrice: { under30: 300, over30: 325 },
            partnerCampaignPrice: null,
          },
        },
      ],
    );
    const data = db.snapshot();
    assert.deepEqual(data.Offers[VIBORG][VIBORG_KAT_1].standardPrice, {
      under30: 420,
      over30: 470,
    });
    assert.deepEqual(Object.keys(data.PriceHistory[VIBORG][VIBORG_KAT_1]), [NIGHT_1, NIGHT_2]);
  });

  test('en ændret Makkerpris står som prisændring og i prishistorikken', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    // Træningsven i Kategori 1 bliver 20 kr dyrere pr. person.
    const routes = fitnessxRoutes();
    routes[VIBORG_URL] = withAjaxObject(routes[VIBORG_URL], (ajaxObject) => {
      for (const { acf } of membershipsTitled(ajaxObject, /^Kategori 1 \+ Træningsven/)) {
        acf.pris = String(Number(acf.pris) + 40);
        acf.pris_pr_person_i_tal = String(Number(acf.pris_pr_person_i_tal) + 20);
      }
    });
    const { report } = await runNight(db, NIGHT_2, { routes });

    const [fitnessx] = report.chains;
    assert.deepEqual(
      fitnessx.priceChanges.filter((change) => change.centerId === VIBORG),
      [
        {
          centerId: VIBORG,
          offerId: VIBORG_KAT_1,
          before: {
            standardPrice: { under30: 400, over30: 450 },
            campaignPrice: null,
            partnerPrice: { under30: 300, over30: 325 },
            partnerCampaignPrice: null,
          },
          after: {
            standardPrice: { under30: 400, over30: 450 },
            campaignPrice: null,
            partnerPrice: { under30: 320, over30: 345 },
            partnerCampaignPrice: null,
          },
        },
      ],
    );
    assert.deepEqual(db.snapshot().PriceHistory[VIBORG][VIBORG_KAT_1][NIGHT_2], {
      standardPrice: { under30: 400, over30: 450 },
      partnerPrice: { under30: 320, over30: 345 },
    });
    assert.match(formatReport(report), /Prisændring fitnessx-viborg .*"partnerPrice":\{"under30":320/);
  });

  test('en tør kørsel beregner opdateringen, men skriver intet', async () => {
    const db = createFakeDatabase();
    const { ok, update } = await runNight(db, NIGHT_1, { dryRun: true });

    assert.equal(ok, true);
    assert.equal(db.updates.length, 0);
    assert.ok(update[`Offers/${VIBORG}/${VIBORG_KAT_2}`]);
  });
});

describe('Fitness X i nat-jobbet: sanity-fejl', () => {
  test('åbningstilbud uden antal Centre afvises og logges; resten skrives', async () => {
    const db = createFakeDatabase();
    const routes = withLindgreensOpeningOffers(fitnessxRoutes(), /Drop 1/);
    const { ok, report } = await runNight(db, NIGHT_1, { routes });

    // 1 af 16 Tilbud fejler (6 %), så Kæden skrives.
    assert.equal(ok, true);
    const [fitnessx] = report.chains;
    assert.deepEqual(fitnessx.failures, [
      {
        centerId: 'fitnessx-koebenhavn-s-lindgreens-alle',
        offerId: 'fitnessx-koebenhavn-s-lindgreens-alle-aabningstilbud-drop-1',
        problems: ['Tilbuddet mangler subscriptionType'],
      },
    ]);
    const offers = db.snapshot().Offers['fitnessx-koebenhavn-s-lindgreens-alle'];
    assert.equal(offers['fitnessx-koebenhavn-s-lindgreens-alle-aabningstilbud-drop-1'], undefined);
    assert.equal(Object.keys(offers).length, 4);
    assert.match(formatReport(report), /Fejl i fitnessx-koebenhavn-s-lindgreens-alle \/ /);
  });

  test('en pris, der falder over 50 % på én nat, skrives ikke', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const routes = withViborgPrice(fitnessxRoutes(), /^Kategori 2 &#8211;/, () => 150);
    const { report } = await runNight(db, NIGHT_2, { routes });

    assert.deepEqual(report.chains[0].failures, [
      {
        centerId: VIBORG,
        offerId: VIBORG_KAT_2,
        problems: [
          // -62,5 % rundes som Math.round til -62.
          'Standardpris (over30) ændret -62 % på én nat (400 → 150 kr/md)',
          'Standardpris (under30) ændret -58 % på én nat (360 → 150 kr/md)',
        ],
      },
    ]);
    assert.deepEqual(report.chains[0].priceChanges, []);
    assert.deepEqual(db.snapshot().Offers[VIBORG][VIBORG_KAT_2].standardPrice, {
      under30: 360,
      over30: 400,
    });
  });
});

describe('Fitness X i nat-jobbet: kædeniveau', () => {
  test('kan centerlisten ikke hentes, springes Fitness X over; SATS skrives stadig', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1, { withSats: true });
    const before = db.snapshot();

    const routes = { ...fitnessxRoutes(), [FITNESSX_CENTER_LIST_URL]: new Error('HTTP 502') };
    const { ok, report } = await runNight(db, NIGHT_2, { routes, withSats: true });

    assert.equal(ok, false);
    const [sats, fitnessx] = report.chains;
    assert.equal(sats.status, 'written');
    assert.equal(fitnessx.status, 'skipped');
    assert.equal(fitnessx.reason, 'Kæden kunne ikke hentes: HTTP 502');
    assert.deepEqual(fitnessx.priceChanges, []);

    const after = db.snapshot();
    assert.deepEqual(after.Chains.fitnessx, before.Chains.fitnessx);
    assert.deepEqual(after.Offers[VIBORG], before.Offers[VIBORG]);
    assert.equal(after.Centers[VIBORG].lastSeen, NIGHT_1);
    assert.equal(after.Centers['sats-412'].lastSeen, NIGHT_2);
  });

  test('alle centersider ændret: Kæden springes over i stedet for tomme data', async () => {
    const routes = fitnessxRoutes();
    for (const { url } of Object.values(FIXTURE_CENTERS)) routes[url] = '<html>Ny side</html>';
    const { ok, report } = await runNight(createFakeDatabase(), NIGHT_1, { routes });

    assert.equal(ok, false);
    // 5 centersider fejler, og Hjørring kan ikke prissættes uden nogen centerside.
    assert.equal(report.chains[0].reason, '6 af 6 fejlede (100 % > 20 %)');
  });

  test('et Center uden link og GUID tæller som fejl, men røres ikke i databasen', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);
    const before = db.snapshot();

    const routes = fitnessxRoutes();
    routes[FITNESSX_CENTER_LIST_URL] = centerListWith(
      [...Object.keys(FIXTURE_CENTERS), 'Hjørring'],
      (name, item) =>
        name === 'Hjørring'
          ? withoutCenterLink(item).replace(/DepartmentId=[0-9a-f-]+/, 'DepartmentId=')
          : item,
    );
    const { ok, report } = await runNight(db, NIGHT_2, { routes });

    // 1 læsefejl mod 14 gyldige Tilbud = 7 %, så Kæden skrives.
    assert.equal(ok, true);
    assert.deepEqual(report.chains[0].failures, [
      {
        centerId: 'fitnessx-hjoerring',
        problems: ['Centret har hverken link til centersiden eller GUID i centerlisten'],
      },
    ]);
    assert.deepEqual(report.chains[0].missing, []);
    const after = db.snapshot();
    assert.deepEqual(after.Centers['fitnessx-hjoerring'], before.Centers['fitnessx-hjoerring']);
  });
});

describe('Fitness X i nat-jobbet: forsvundne Tilbud og Centre ("sidst set")', () => {
  // Viborg uden Kategori 1, og Carlsberg Byen ikke længere i centerlisten.
  const laterRoutes = () => {
    const routes = fitnessxRoutes();
    routes[VIBORG_URL] = withAjaxObject(routes[VIBORG_URL], (ajaxObject) => {
      for (const membership of membershipsTitled(ajaxObject, /^Kategori 1/)) {
        membership.acf.centre = membership.acf.centre.filter((guid) => guid !== GUIDS.viborg);
      }
    });
    routes[FITNESSX_CENTER_LIST_URL] = centerListWith(
      ['Aarhus C, Ankersgade', 'København S, Lindgreens Allé', 'Roskilde, Skomagergade', 'Viborg'],
    );
    return routes;
  };
  const CARLSBERG = 'fitnessx-koebenhavn-v-carlsberg-byen';

  test('1. og 2. nat: beholdt med "sidst set"; 3. nat: fjernet', async () => {
    const db = createFakeDatabase();
    await runNight(db, NIGHT_1);

    const { report } = await runNight(db, NIGHT_2, { routes: laterRoutes() });
    let data = db.snapshot();
    assert.equal(data.Offers[VIBORG][VIBORG_KAT_1].missingNights, 1);
    assert.equal(data.Offers[VIBORG][VIBORG_KAT_1].lastSeen, NIGHT_1);
    assert.equal(data.Centers[CARLSBERG].missingNights, 1);
    assert.deepEqual(
      report.chains[0].missing.filter((entry) => [VIBORG, CARLSBERG].includes(entry.centerId)),
      [
        { centerId: VIBORG, offerId: VIBORG_KAT_1, missingNights: 1 },
        { centerId: CARLSBERG, missingNights: 1 },
      ],
    );

    await runNight(db, NIGHT_3, { routes: laterRoutes() });
    data = db.snapshot();
    assert.equal(data.Offers[VIBORG][VIBORG_KAT_1].missingNights, 2);
    assert.equal(data.Centers[CARLSBERG].missingNights, 2);

    await runNight(db, NIGHT_4, { routes: laterRoutes() });
    data = db.snapshot();
    assert.equal(data.Offers[VIBORG][VIBORG_KAT_1], undefined);
    assert.equal(data.Centers[CARLSBERG], undefined);
    assert.equal(data.Offers[CARLSBERG], undefined);
    assert.deepEqual(Object.keys(data.Offers[VIBORG]), [VIBORG_KAT_2]);
  });

  test('de håndindtastede Fitness X-Centre udfases efter 3 nætter', async () => {
    const db = seededDatabase();
    await runNight(db, NIGHT_1);
    assert.equal(db.snapshot().Centers['fitnessx-fisketorvet'].missingNights, 1);
    await runNight(db, NIGHT_2);
    await runNight(db, NIGHT_3);
    const data = db.snapshot();

    assert.equal(data.Centers['fitnessx-fisketorvet'], undefined);
    assert.equal(data.Centers['fitnessx-lyngby'], undefined);
    assert.equal(data.Offers['fitnessx-lyngby'], undefined);
    // Andre Kæders håndindtastede data røres ikke.
    assert.ok(data.Centers['puregym-oesterbro']);
    assert.ok(data.Centers['sats-oesterbro']);
  });
});
