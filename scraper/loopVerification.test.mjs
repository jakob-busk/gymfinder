// LOOP-stikprøvens sammenligning testet mod gemte sider fra loopfitness.dk og aeldresagen.dk.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { scrapeLoop } from './chains/loop.mjs';
import {
  compareAeldreSagen,
  compareLoopCenter,
  formatLoopVerification,
  parseAeldreSagenOffer,
  parseSubscriptionAnswer,
  parseVisibleCenterPage,
} from './loopVerification.mjs';
import {
  createFixtureHttp,
  loopFixture,
  loopJsonFixture,
  loopRoutes,
} from './testing/loopFixtures.mjs';

const TODAY = '2026-10-22';
const VOKSEN_CARD = 'kampagne: 100 kr. resten af året';
const FAMILY_CARD = 'kampagne: 100 kr resten af året - familie';

const scraped = async () => scrapeLoop({ http: createFixtureHttp(loopRoutes()), today: TODAY });
const aabenraa = async () => (await scraped()).centers.find((center) => center.id === 'loop-145');

const answers = () => ({
  [VOKSEN_CARD]: loopJsonFixture('abonnement-145-voksen.json'),
  [FAMILY_CARD]: loopJsonFixture('abonnement-145-familie.json'),
});
const centerPage = () => loopFixture('centerside-145-aabenraa.html');
const checkNamed = (result, what) => result.checks.find((check) => check.what === what);

describe('LOOP-stikprøve: det en besøgende ser', () => {
  test('centersiden: synlig adresse, åbningstid, priskort og nonce', () => {
    assert.deepEqual(parseVisibleCenterPage(centerPage()), {
      address: 'Møllemærsk 24, 6200 Aabenraa',
      hoursText: 'Åbent alle dage fra 05 – 22',
      open24h: false,
      priceCards: [
        { centerId: '145', subscription: VOKSEN_CARD },
        { centerId: '145', subscription: FAMILY_CARD },
        { centerId: '145', subscription: 'kids' },
      ],
      nonce: 'd72223aac5',
    });
  });

  test('priskortets tekster for Voksen og Familie', () => {
    assert.deepEqual(parseSubscriptionAnswer(loopJsonFixture('abonnement-145-voksen.json')), {
      found: true,
      name: 'Kampagne: 100 kr. resten af året',
      family: false,
      regularPrice: 289,
      periodDays: 30,
      trialPrice: 100,
      trialUntil: '2026-12-31',
      adminFee: 10,
      minimumPrice: 399,
    });
    const family = parseSubscriptionAnswer(loopJsonFixture('abonnement-145-familie.json'));
    assert.deepEqual(
      [family.family, family.regularPrice, family.adminFee, family.minimumPrice],
      [true, 589, 10, 699],
    );
  });

  test('et ukendt abonnement giver LOOPs egen fejltekst', () => {
    assert.deepEqual(parseSubscriptionAnswer(loopJsonFixture('abonnement-ikke-fundet.json')), {
      found: false,
      message: 'Abonnement blev ikke fundet',
    });
  });

  test('Ældre Sagens side: 15 % og Oprettelse 199 kr', () => {
    assert.deepEqual(parseAeldreSagenOffer(loopFixture('aeldresagen-loop.html')), {
      percentOff: 15,
      signupFee: 199,
      adminFee: 10,
    });
  });
});

describe('LOOP-stikprøve: sammenligning', () => {
  test('Aabenraa stemmer i alle felter, inkl. kampagne, Admingebyr og familie', async () => {
    const result = compareLoopCenter(await aabenraa(), centerPage(), answers());

    assert.deepEqual(
      result.checks.map((check) => [check.what, check.scraper, check.website, check.ok]),
      [
        ['Adresse', 'Møllemærsk 24, 6200 Aabenraa', 'Møllemærsk 24, 6200 Aabenraa', true],
        ['Døgnåbent', 'nej', 'nej (Åbent alle dage fra 05 – 22)', true],
        ['Voksen: Standardpris (kr pr. 30 dage)', 289, 289, true],
        ['Voksen: betaling pr. antal dage', 30, 30, true],
        ['Voksen: Admingebyr (kr)', 10, 10, true],
        ['Voksen: kampagne i alt (kr)', 100, 100, true],
        ['Voksen: kampagnen slutter', '2026-12-31', '2026-12-31', true],
        ['Voksen: minimumspris (kr)', 399, 399, true],
        ['Familie (Træn med en makker): pris pr. husstand (kr pr. 30 dage)', 589, 589, true],
      ],
    );
  });

  test('et priskort uden lavere første betaling er ingen kampagne (Skagen, ALL IN)', async () => {
    const skagen = (await scraped()).centers.find((center) => center.id === 'loop-114');
    const card = 'ALL IN (DS, LOOP & HOLD)';
    const html = centerPage().replace(
      `data-subscription="${VOKSEN_CARD.replace('å', '&aring;')}"`,
      'data-subscription="ALL IN (DS, LOOP &amp; HOLD)"',
    );
    // LOOPs svar for ALL IN: første betaling 349 = prisen, derefter 349 + 10.
    const answer = structuredClone(loopJsonFixture('abonnement-145-voksen.json'));
    Object.assign(answer.data.prices, { trial: { days: 30, price: 349 } });
    answer.data.prices.regular.full_price = 349;
    Object.assign(answer.data.texts, {
      trial_text: '',
      regular_price_text: 'Derefter: 349 kr. pr. 30 dage',
      signup_fee_text: 'Minimumspris i perioden: 708 kr.',
    });
    const result = compareLoopCenter(skagen, html, { ...answers(), [card]: answer });

    const allIn = result.checks.filter((check) => check.what.startsWith('ALL IN'));
    assert.deepEqual(
      allIn.map((check) => [check.what.replace(`${card}: `, ''), check.ok]),
      [
        ['Standardpris (kr pr. 30 dage)', true],
        ['betaling pr. antal dage', true],
        ['Admingebyr (kr)', true],
        ['kampagne i alt (kr)', true],
        ['kampagnen slutter', true],
        ['minimumspris (kr)', true],
      ],
    );
  });

  test('en forkert Standardpris opdages (også i minimumsprisen)', async () => {
    const center = await aabenraa();
    center.offers[0].standardPrice = 279;
    const result = compareLoopCenter(center, centerPage(), answers());

    assert.deepEqual(checkNamed(result, 'Voksen: Standardpris (kr pr. 30 dage)'), {
      what: 'Voksen: Standardpris (kr pr. 30 dage)',
      scraper: 279,
      website: 289,
      ok: false,
    });
    assert.equal(checkNamed(result, 'Voksen: minimumspris (kr)').ok, false);
  });

  test('en kampagne, scraperen har overset, opdages', async () => {
    const center = await aabenraa();
    Object.assign(center.offers[0], { campaignPrice: null, campaignMonths: 0 });
    delete center.offers[0].campaignEndDate;
    const result = compareLoopCenter(center, centerPage(), answers());

    assert.equal(checkNamed(result, 'Voksen: kampagne i alt (kr)').ok, false);
    assert.equal(checkNamed(result, 'Voksen: kampagnen slutter').ok, false);
  });

  test('en manglende Makkerpris opdages', async () => {
    const center = await aabenraa();
    center.offers[0].partnerPrice = null;
    const result = compareLoopCenter(center, centerPage(), answers());
    const family = result.checks.at(-1);
    assert.deepEqual([family.scraper, family.website, family.ok], [undefined, 589, false]);
  });

  test('en forkert adresse og et priskort, som scraperen ikke kender, opdages', async () => {
    const center = await aabenraa();
    center.address = 'Møllemærsk 42, 6200 Aabenraa';
    const html = centerPage().replace(
      'data-subscription="kids"',
      'data-subscription="black week"',
    );
    const result = compareLoopCenter(center, html, {
      ...answers(),
      'black week': { success: false, data: { message: 'Abonnement blev ikke fundet' } },
    });

    assert.equal(checkNamed(result, 'Adresse').ok, false);
    assert.deepEqual(checkNamed(result, 'Priskort "black week"'), {
      what: 'Priskort "black week"',
      scraper: undefined,
      website: 'Abonnement blev ikke fundet',
      ok: false,
    });
  });

  test('Ældre Sagen-rabatten stemmer med Ældre Sagens side, og en afvigelse opdages', async () => {
    const { chain } = await scraped();
    const result = compareAeldreSagen(chain, loopFixture('aeldresagen-loop.html'));
    assert.ok(result.checks.every((check) => check.ok));

    const changed = loopFixture('aeldresagen-loop.html').replace('<p>15%</p>', '<p>20%</p>');
    assert.deepEqual(compareAeldreSagen(chain, changed).checks[0], {
      what: 'Rabat (%)',
      scraper: 15,
      website: 20,
      ok: false,
    });
  });

  test('rapporten siger AFVIGER, hvis bare ét felt ikke stemmer', () => {
    const ok = { what: 'Adresse', scraper: 'x', website: 'x', ok: true };
    const bad = { what: 'Voksen: Admingebyr (kr)', scraper: 1, website: 2, ok: false };
    const base = { centerId: 'loop-1', name: 'LOOP Viborg', url: 'https://loopfitness.dk' };

    const good = formatLoopVerification({
      date: TODAY,
      results: [{ ...base, checks: [ok] }],
    });
    assert.equal(good.allOk, true);
    assert.match(good.markdown, /Resultat: \*\*STEMMER\*\*/);

    const failing = formatLoopVerification({
      date: TODAY,
      results: [{ ...base, checks: [ok, bad] }],
    });
    assert.equal(failing.allOk, false);
    assert.match(failing.markdown, /Resultat: \*\*AFVIGER\*\*/);
    assert.match(failing.markdown, /\| Voksen: Admingebyr \(kr\) \| 1 \| 2 \| NEJ \|/);
  });

  test('en sanity-fejl i live-kørslen gør også resultatet til AFVIGER', () => {
    const ok = { what: 'Adresse', scraper: 'x', website: 'x', ok: true };
    const liveRun = {
      status: 'written',
      centersFound: 137,
      validOffers: 141,
      failures: [{ centerId: 'loop-220', offerId: 'loop-220-voksen', problems: ['For dyr'] }],
      warnings: [],
    };
    const { markdown, allOk } = formatLoopVerification({
      date: TODAY,
      results: [{ centerId: 'loop-1', name: 'LOOP Viborg', url: 'x', checks: [ok] }],
      liveRun,
    });
    assert.equal(allOk, false);
    assert.match(markdown, /- Centre fundet: 137/);
    assert.match(markdown, /- Fejl i loop-220 \/ loop-220-voksen: For dyr/);
  });
});
