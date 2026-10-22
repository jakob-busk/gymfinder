// LOOP-parseren testet mod gemte rigtige svar fra loopfitness.dk (fixtures/loop/, hentet
// 2026-10-22). Forventningerne er aflæst på siderne og står direkte i testene.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LOOP_CENTER_LIST_URL,
  LOOP_PRICES_URL,
  LOOP_SIGNUP_URL,
  extractInlineObject,
  parseCampaign,
  parseCenterList,
  parsePricesPage,
  parseSignupPage,
  scrapeLoop,
  signupUrlFor,
  subscriptionParam,
} from './loop.mjs';
import { centerProblems, isInDenmark, offerProblems } from '../sanity.mjs';
import {
  centerListWith,
  createFixtureHttp,
  fullCenterList,
  locationById,
  loopFixture,
  loopRoutes,
  withLocations,
} from '../testing/loopFixtures.mjs';

const TODAY = '2026-10-22';

// Tilmeldingssidens priskort, som linkene bruges med.
const SIGNUP_CARDS = parseSignupPage(loopFixture('bliv-medlem.html'));

const parseFixture = (html = loopFixture('centerliste.html'), today = TODAY) =>
  parseCenterList(html, today, { signupCards: SIGNUP_CARDS });
const centerById = (result, id) => result.centers.find((center) => center.id === id);
const offerNames = (center) => center.offers.map((offer) => offer.name);

// Voksen-abonnementet med kampagnen "100 kr. resten af året", som alle Centre har.
const adultOffer = (loopId) => ({
  id: `loop-${loopId}-voksen`,
  name: 'Voksen',
  subscriptionType: 'Landsdækkende',
  standardPrice: 289,
  // 100 kr. dækker 22/10–31/12 = 71 dage = 2 hele perioder à 30 dage → 50 kr pr. periode.
  campaignPrice: 50,
  campaignMonths: 2,
  campaignEndDate: '2026-12-31',
  campaignText: 'Kampagne: 100 kr. resten af året',
  signupFee: 0,
  adminFee: 10,
  bindingMonths: 0,
  billingIntervalDays: 30,
  // Familiemedlemskabet 589 + 10 kr for to personer: 299,50 kr pr. person inkl. Admingebyr.
  partnerPrice: 289.5,
  // Familiens kampagne: 100 kr for husstanden fordelt på 2 perioder = 50 kr pr. periode;
  // (50 + 10) / 2 − 10 = 20 kr pr. person uden Admingebyr.
  partnerCampaignPrice: 20,
  partnerCampaignMonths: 2,
  partnerSignupFee: 0,
  partnerRequirement:
    'I skal bo i samme husstand og deler ét familiemedlemskab til 589 kr + 10 kr i ' +
    'Admingebyr pr. 30 dage.',
  // Priskortets egen stavemåde (lille k), ellers vælger tilmeldingssiden kun Centret.
  signupUrl:
    `https://loopfitness.dk/medlemskab/bliv-medlem/?center=${loopId}` +
    '&subscription=kampagne%3A+100+kr.+resten+af+%C3%A5ret',
  partnerSignupUrl:
    `https://loopfitness.dk/medlemskab/bliv-medlem/?center=${loopId}` +
    '&subscription=kampagne%3A+100+kr+resten+af+%C3%A5ret+-+familie',
});

describe('LOOP centerliste', () => {
  const result = parseFixture();

  test('finder alle 9 Centre i den trimmede liste uden fejl', () => {
    assert.deepEqual(
      result.centers.map((center) => center.id),
      [
        'loop-145',
        'loop-119',
        'loop-232',
        'loop-221',
        'loop-143',
        'loop-193',
        'loop-114',
        'loop-220',
        'loop-1',
      ],
    );
    assert.deepEqual(result.readErrors, []);
    assert.deepEqual(result.warnings, []);
  });

  test('Aabenraa: adresse, koordinater, faciliteter, link og Voksen med Makkerpris', () => {
    assert.deepEqual(centerById(result, 'loop-145'), {
      id: 'loop-145',
      chainId: 'loop',
      name: 'LOOP Aabenraa',
      address: 'Møllemærsk 24, 6200 Aabenraa',
      location: { latitude: 55.039541, longitude: 9.420585 },
      // Åbent 05–22 alle dage, ingen holdtræning. Sauna oplyser LOOP ikke ("Ikke oplyst").
      facilities: { groupClasses: false, open24h: false },
      signupUrl: 'https://loopfitness.dk/centre/loop-fitness-aabenraa/',
      offers: [adultOffer(145)],
    });
  });

  test('feriepas (betales kontant, 1–30 dage) bliver ikke til Tilbud', () => {
    const raw = extractInlineObject(loopFixture('centerliste.html'), 'var locations = ');
    const groups = locationById(raw, 145).public_groups;
    assert.equal(groups.filter((group) => group.payment_type === 'instant').length, 5);
    assert.deepEqual(offerNames(centerById(result, 'loop-145')), ['Voksen']);
  });

  test('to adresselinjer (butikscenter + gade) kommer begge med', () => {
    assert.equal(
      centerById(result, 'loop-232').address,
      'Ballerup Centret, Banetoften 30, 2750 Ballerup',
    );
  });

  test('05:00–23:59 er ikke døgnåbent; holdtræning følger Centrets classes', () => {
    assert.deepEqual(centerById(result, 'loop-119').facilities, {
      groupClasses: false,
      open24h: false,
    });
    assert.deepEqual(centerById(result, 'loop-143').facilities, {
      groupClasses: true,
      open24h: false,
    });
  });

  test('00:00–23:59 alle dage er døgnåbent; manglende tider er ukendt', () => {
    const html = withLocations(loopFixture('centerliste.html'), (locations) => {
      const aabenraa = locationById(locations, 145);
      for (let day = 1; day <= 7; day += 1) {
        aabenraa[`day${day}_open`] = '00:00';
        aabenraa[`day${day}_close`] = '23:59';
      }
      delete locationById(locations, 119).day3_close;
    });
    const changed = parseFixture(html);
    assert.equal(centerById(changed, 'loop-145').facilities.open24h, true);
    assert.equal('open24h' in centerById(changed, 'loop-119').facilities, false);
  });

  test('Nibe: to ekstra Tilbud med holdtræning, det ene med kampagne de første 30 dage', () => {
    const [voksen, holdtraening, loopMedHold] = centerById(result, 'loop-143').offers;
    assert.deepEqual(voksen, adultOffer(143));
    assert.deepEqual(
      [holdtraening.id, holdtraening.name, holdtraening.standardPrice],
      ['loop-143-holdtraening', 'Holdtræning', 289],
    );
    assert.deepEqual(
      [holdtraening.campaignPrice, holdtraening.campaignMonths, holdtraening.campaignEndDate],
      [269, 1, undefined],
    );
    assert.equal(holdtraening.partnerPrice, null);
    // Kampagneprisen er lig Standardprisen (319), så der er ingen kampagne.
    assert.deepEqual(
      [loopMedHold.id, loopMedHold.standardPrice, loopMedHold.campaignPrice],
      ['loop-143-loop-med-holdtraening', 319, null],
    );
    assert.equal(loopMedHold.campaignMonths, 0);
  });

  test('Skagen: ALL IN FAMILY er Makkerpris på ALL IN; Destination Skagen er lokal', () => {
    const skagen = centerById(result, 'loop-114');
    assert.deepEqual(offerNames(skagen), [
      'Voksen',
      'ALL IN (DS, LOOP & HOLD)',
      'Destination Skagen',
    ]);
    const allIn = skagen.offers[1];
    assert.equal(allIn.id, 'loop-114-all-in-ds-loop-hold');
    assert.equal(allIn.standardPrice, 349);
    // (649 + 10) / 2 = 329,50 kr pr. person inkl. Admingebyr → 319,50 + 10.
    assert.equal(allIn.partnerPrice, 319.5);
    // ALL IN FAMILY har ingen kampagne (kampagneprisen er lig prisen).
    assert.equal('partnerCampaignPrice' in allIn, false);
    assert.match(allIn.partnerRequirement, /649 kr \+ 10 kr i Admingebyr pr\. 30 dage/);
    // Uden priskort bruges abonnementernes egne navne (siden viser dem som ekstra knapper).
    assert.equal(
      allIn.signupUrl,
      'https://loopfitness.dk/medlemskab/bliv-medlem/?center=114' +
        '&subscription=ALL+IN+%28DS%2C+LOOP+%26+HOLD%29',
    );
    assert.equal(
      new URL(allIn.partnerSignupUrl).searchParams.get('subscription'),
      'ALL IN FAMILY (DS, LOOP & HOLD)',
    );

    const destination = skagen.offers[2];
    assert.equal(destination.subscriptionType, 'Lokal center');
    assert.deepEqual([destination.campaignPrice, destination.campaignMonths], [269, 1]);
  });

  test('familiens kampagne udløber sammen med Voksen-kampagnen', () => {
    const [voksen] = centerById(parseFixture(undefined, '2026-12-15'), 'loop-145').offers;
    assert.equal(voksen.partnerPrice, 289.5);
    assert.equal('partnerCampaignPrice' in voksen, false);
    assert.equal(voksen.campaignPrice, null);
  });

  test('Viborg: "20 år 20 kr første 30 dage" er et ekstra Tilbud med kampagne i én periode', () => {
    const [, birthday] = centerById(result, 'loop-1').offers;
    assert.equal(birthday.id, 'loop-1-20-aar-20-kr-foerste-30-dage');
    assert.equal(birthday.name, '20 år 20 kr første 30 dage');
    assert.deepEqual([birthday.standardPrice, birthday.campaignPrice], [289, 20]);
    assert.equal(birthday.campaignMonths, 1);
  });

  test('personale og aftaler for foreninger, bosteder og skoler bliver ikke til Tilbud', () => {
    // Gilleleje har "Personale" (0 kr, payment_type free), Ringe "Forening, Bosteder og
    // Skoler aftaler" (589 kr).
    assert.deepEqual(offerNames(centerById(result, 'loop-221')), ['Voksen']);
    assert.deepEqual(offerNames(centerById(result, 'loop-193')), ['Voksen']);
  });

  test('alle Centre har adresse, link og koordinater i Danmark', () => {
    for (const center of result.centers) {
      assert.ok(center.name.startsWith('LOOP '), center.id);
      assert.match(center.address, /^.+, \d{4} .+$/, center.id);
      assert.match(center.signupUrl, /^https:\/\/loopfitness\.dk\/centre\/.+\/$/, center.id);
      assert.ok(isInDenmark(center.location), center.id);
    }
  });

  test('et Center uden abonnementer, man kan købe, bliver en læsefejl', () => {
    const html = withLocations(loopFixture('centerliste.html'), (locations) => {
      const valby = locationById(locations, 220);
      valby.public_groups = valby.public_groups.filter((group) => group.payment_type === 'instant');
    });
    const changed = parseFixture(html);
    assert.deepEqual(changed.readErrors, [
      { centerId: 'loop-220', message: 'Centret har ingen abonnementer' },
    ]);
    assert.equal(centerById(changed, 'loop-220'), undefined);
  });

  test('et familiemedlemskab uden almindeligt abonnement springes over med en advarsel', () => {
    const html = withLocations(loopFixture('centerliste.html'), (locations) => {
      const skagen = locationById(locations, 114);
      skagen.public_groups = skagen.public_groups.filter(
        (group) => group.name !== 'ALL IN (DS, LOOP & HOLD)',
      );
    });
    const changed = parseFixture(html);
    assert.deepEqual(changed.warnings, [
      'LOOP Skagen: familiemedlemskabet "ALL IN FAMILY (DS, LOOP & HOLD)" har intet ' +
        'almindeligt abonnement at høre til og springes over',
    ]);
    assert.deepEqual(offerNames(centerById(changed, 'loop-114')), [
      'Voksen',
      'Destination Skagen',
    ]);
  });

  test('uden familiemedlemskab er der ingen Makkerpris', () => {
    const html = withLocations(loopFixture('centerliste.html'), (locations) => {
      const aabenraa = locationById(locations, 145);
      aabenraa.public_groups = aabenraa.public_groups.filter((group) => !group.family_members);
    });
    const [voksen] = centerById(parseFixture(html), 'loop-145').offers;
    assert.equal(voksen.partnerPrice, null);
    assert.equal('partnerRequirement' in voksen, false);
  });

  test('manglende koordinater og adresse bliver ikke gættet', () => {
    const html = withLocations(loopFixture('centerliste.html'), (locations) => {
      const valby = locationById(locations, 220);
      valby.lat = '';
      valby.address_line_1 = ' ';
    });
    const valby = centerById(parseFixture(html), 'loop-220');
    assert.equal(valby.location, undefined);
    assert.equal(valby.address, undefined);
    assert.deepEqual(centerProblems(valby), [
      'Centret mangler address',
      'Centret mangler koordinater',
    ]);
  });

  test('en side uden var locations giver en tydelig fejl', () => {
    assert.throws(
      () => parseCenterList('<html><body>Vedligehold</body></html>', TODAY),
      /ingen var locations/,
    );
  });

  test('limit tager kun de første Centre', () => {
    const limited = parseCenterList(loopFixture('centerliste.html'), TODAY, { limit: 2 });
    assert.deepEqual(limited.centers.map((center) => center.id), ['loop-145', 'loop-119']);
  });
});

describe('hele den rigtige centerliste (alle 137 Centre, urørt)', () => {
  const result = parseFixture(fullCenterList());

  test('alle 137 Centre læses uden fejl og advarsler og med unikke id\'er', () => {
    assert.equal(result.centers.length, 137);
    assert.equal(new Set(result.centers.map((center) => center.id)).size, 137);
    assert.deepEqual(result.readErrors, []);
    assert.deepEqual(result.warnings, []);
  });

  test('alle Centre og Tilbud består sanity-reglerne', () => {
    for (const center of result.centers) {
      assert.deepEqual(centerProblems(center), [], center.id);
      for (const offer of center.offers) {
        assert.deepEqual(offerProblems(offer, undefined), [], offer.id);
      }
    }
  });

  test('alle Centre har Voksen til 289 kr pr. 30 dage med familiemedlemskab som Makkerpris', () => {
    for (const center of result.centers) {
      assert.deepEqual(center.offers[0], adultOffer(center.id.replace('loop-', '')), center.id);
    }
  });

  test('ekstra Tilbud findes kun i Nibe, Skagen og Viborg', () => {
    const extra = result.centers
      .filter((center) => center.offers.length > 1)
      .map((center) => [center.name, offerNames(center).slice(1)]);
    assert.deepEqual(extra, [
      ['LOOP Nibe', ['Holdtræning', 'LOOP med holdtræning']],
      ['LOOP Skagen', ['ALL IN (DS, LOOP & HOLD)', 'Destination Skagen']],
      ['LOOP Viborg', ['20 år 20 kr første 30 dage']],
    ]);
  });

  test('ingen Centre er døgnåbne, og 21 har holdtræning', () => {
    assert.equal(result.centers.filter((center) => center.facilities.open24h !== false).length, 0);
    assert.equal(result.centers.filter((center) => center.facilities.groupClasses).length, 21);
  });
});

describe('LOOP kampagne', () => {
  const voksen = {
    price: '289.0',
    trial_period_1_months: 1,
    trial_period_1_price: '100.0',
    trial_period_1_quantity: 30,
    trial_period_1_until: '2026-12-31',
  };

  test('"100 kr. resten af året" fordeles på de hele 30-dages-perioder til og med 31/12', () => {
    // 22/10–31/12 = 71 dage = 2 hele perioder.
    assert.deepEqual(parseCampaign(voksen, '2026-10-22'), {
      campaign: { price: 50, months: 2, endDate: '2026-12-31' },
    });
    // 1/12–31/12 = 31 dage = 1 hel periode; hele beløbet i den.
    assert.deepEqual(parseCampaign(voksen, '2026-12-01'), {
      campaign: { price: 100, months: 1, endDate: '2026-12-31' },
    });
    // 22/10–20/1 = 91 dage = 3 perioder; 100 / 3 afrundes til øre.
    assert.deepEqual(parseCampaign({ ...voksen, trial_period_1_until: '2027-01-20' }, TODAY), {
      campaign: { price: 33.33, months: 3, endDate: '2027-01-20' },
    });
  });

  test('under 30 dage tilbage eller udløbet: ingen kampagne (hellere for høj pris)', () => {
    assert.deepEqual(parseCampaign(voksen, '2026-12-05'), { campaign: null });
    assert.deepEqual(parseCampaign(voksen, '2027-01-02'), { campaign: null });
  });

  test('uden slutdato gælder kampagneprisen de første perioder', () => {
    const birthday = { ...voksen, trial_period_1_price: '20.0', trial_period_1_until: null };
    assert.deepEqual(parseCampaign(birthday, TODAY), { campaign: { price: 20, months: 1 } });
  });

  test('kampagnepris lig Standardprisen er ingen kampagne', () => {
    const allIn = { ...voksen, price: '349.0', trial_period_1_price: '349.0' };
    assert.deepEqual(parseCampaign({ ...allIn, trial_period_1_until: null }, TODAY), {
      campaign: null,
    });
  });

  test('ukendte former giver en advarsel i stedet for en gættet pris', () => {
    const weekly = { ...voksen, trial_period_1_until: null, trial_period_1_quantity: 7 };
    assert.deepEqual(parseCampaign(weekly, TODAY), {
      campaign: null,
      warning: 'kampagneperiode på 7 dage',
    });
    assert.deepEqual(parseCampaign({ ...voksen, trial_period_1_until: '31.12.26' }, TODAY), {
      campaign: null,
      warning: 'ukendt slutdato "31.12.26"',
    });
  });

  test('advarslerne kommer med i Centrets resultat', () => {
    const html = withLocations(loopFixture('centerliste.html'), (locations) => {
      const [voksenGroup] = locationById(locations, 145).public_groups.filter(
        (group) => group.name === 'Kampagne: 100 kr. resten af året',
      );
      voksenGroup.trial_period_1_until = 'snart';
      voksenGroup.trial_period_2_months = 1;
    });
    assert.deepEqual(parseFixture(html).warnings, [
      'LOOP Aabenraa / Voksen: kampagnen kunne ikke læses (ukendt slutdato "snart")',
      'LOOP Aabenraa / Voksen: andet kampagnetrin regnes ikke med',
    ]);
  });
});

describe('LOOP rabatter (/priser/)', () => {
  test('læser Studerende og Ældre Sagen fra rabatkortene; de to foreninger springes over', () => {
    assert.deepEqual(parsePricesPage(loopFixture('priser.html')), [
      { discountGroup: 'student', percentOff: 15, signupFee: 199, discountedPrice: 245.65 },
      { discountGroup: 'aeldreSagen', percentOff: 15, signupFee: 199, discountedPrice: 245.65 },
    ]);
  });

  test('Kæden får Rabatterne på Voksen med normalt Oprettelsesgebyr', async () => {
    const result = await scrapeLoop({ http: createFixtureHttp(loopRoutes()), today: TODAY });
    assert.deepEqual(result.chain, {
      id: 'loop',
      name: 'LOOP Fitness',
      website: 'https://loopfitness.dk',
      discounts: [
        { discountGroup: 'student', percentOff: 15, offerNames: ['Voksen'], signupFee: 199 },
        { discountGroup: 'aeldreSagen', percentOff: 15, offerNames: ['Voksen'], signupFee: 199 },
      ],
    });
  });

  test('advarer, hvis kortets pris ikke passer med procenten af Voksen-prisen', async () => {
    const routes = loopRoutes();
    routes[LOOP_PRICES_URL] = routes[LOOP_PRICES_URL].replace('15% rabat', '20% rabat');
    const result = await scrapeLoop({ http: createFixtureHttp(routes), today: TODAY });
    assert.deepEqual(result.warnings, [
      'Rabatkortet for student viser 245.65 kr, men 20 % af 289 kr er 231.2 kr',
    ]);
    assert.equal(result.chain.discounts[0].percentOff, 20);
  });

  test('mangler et rabatkort, fejler kørslen, så Rabatten ikke forsvinder stille', async () => {
    const routes = loopRoutes();
    routes[LOOP_PRICES_URL] = routes[LOOP_PRICES_URL].replace(/Ældre Sagen/g, 'Fagforeningen');
    await assert.rejects(
      scrapeLoop({ http: createFixtureHttp(routes), today: TODAY }),
      /intet rabatkort for aeldreSagen/,
    );
  });

  test('et rabatkort uden procent fejler hele kørslen', async () => {
    const routes = loopRoutes();
    routes[LOOP_PRICES_URL] = routes[LOOP_PRICES_URL].replace(/15% rabat/g, 'Særpris');
    await assert.rejects(
      scrapeLoop({ http: createFixtureHttp(routes), today: TODAY }),
      /Rabatkortet for student kunne ikke læses/,
    );
  });
});

describe('hele LOOP-kørslen (falsk HTTP med gemte svar)', () => {
  test('er høflig: kun tre kald, centerlisten, prissiden og tilmeldingssiden', async () => {
    const http = createFixtureHttp(loopRoutes());
    const result = await scrapeLoop({ http, today: TODAY });

    assert.deepEqual(http.requests, [LOOP_CENTER_LIST_URL, LOOP_PRICES_URL, LOOP_SIGNUP_URL]);
    assert.deepEqual(result.centers[0].offers[0], adultOffer(145));
    assert.equal(result.centers.length, 9);
    assert.deepEqual(result.readErrors, []);
    assert.deepEqual(result.warnings, []);
  });

  test('limit giver kun de første Centre', async () => {
    const result = await scrapeLoop({
      http: createFixtureHttp(loopRoutes()),
      today: TODAY,
      limit: 3,
    });
    assert.deepEqual(
      result.centers.map((center) => center.id),
      ['loop-145', 'loop-119', 'loop-232'],
    );
  });

  test('kan centerlisten ikke hentes, fejler hele kørslen', async () => {
    const routes = { ...loopRoutes(), [LOOP_CENTER_LIST_URL]: new Error('HTTP 502') };
    await assert.rejects(scrapeLoop({ http: createFixtureHttp(routes), today: TODAY }), /HTTP 502/);
  });

  test('kan prissiden ikke hentes, fejler hele kørslen', async () => {
    const routes = { ...loopRoutes(), [LOOP_PRICES_URL]: new Error('HTTP 503') };
    await assert.rejects(scrapeLoop({ http: createFixtureHttp(routes), today: TODAY }), /HTTP 503/);
  });

  test('kan tilmeldingssiden ikke hentes, bruges abonnementernes navne med en advarsel', async () => {
    const routes = { ...loopRoutes(), [LOOP_SIGNUP_URL]: new Error('HTTP 503') };
    const result = await scrapeLoop({ http: createFixtureHttp(routes), today: TODAY });
    assert.equal(result.centers.length, 9);
    assert.deepEqual(result.warnings, ['Tilmeldingssiden kunne ikke hentes (HTTP 503)']);
    assert.equal(
      new URL(result.centers[0].offers[0].signupUrl).searchParams.get('subscription'),
      'Kampagne: 100 kr. resten af året',
    );
  });

  test('en tom centerliste giver 0 Centre', async () => {
    const routes = { ...loopRoutes(), [LOOP_CENTER_LIST_URL]: centerListWith([]) };
    const result = await scrapeLoop({ http: createFixtureHttp(routes), today: TODAY });
    assert.deepEqual(result.centers, []);
  });
});

describe('tilmeldingslink', () => {
  test('samme form som LOOPs egne priskort: Center og abonnementets navn', () => {
    assert.equal(
      signupUrlFor({ loopId: 145, subscription: 'kampagne: 100 kr resten af året - familie' }),
      'https://loopfitness.dk/medlemskab/bliv-medlem/?center=145' +
        '&subscription=kampagne%3A+100+kr+resten+af+%C3%A5ret+-+familie',
    );
    assert.equal(
      signupUrlFor({ loopId: 1 }),
      'https://loopfitness.dk/medlemskab/bliv-medlem/?center=1',
    );
  });

  test('tilmeldingssidens priskort læses uden "kids"', () => {
    assert.deepEqual(SIGNUP_CARDS, [
      'kampagne: 100 kr. resten af året',
      'kampagne: 100 kr resten af året - familie',
      'Åbningskampagne - flintholm - 1 kr.',
      'Åbningskampagne familie - flintholm',
    ]);
  });

  test('priskortets stavemåde bruges, ellers abonnementets eget navn', () => {
    assert.equal(
      subscriptionParam('Kampagne:  100 kr. resten af året ', SIGNUP_CARDS),
      'kampagne: 100 kr. resten af året',
    );
    assert.equal(subscriptionParam(' LOOP med holdtræning', SIGNUP_CARDS), 'LOOP med holdtræning');
    assert.equal(subscriptionParam('Holdtræning'), 'Holdtræning');
  });
});
