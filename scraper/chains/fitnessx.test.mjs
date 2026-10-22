// Fitness X-parseren testet mod gemte rigtige svar fra fitnessx.dk (fixtures/fitnessx/, hentet
// 2026-10-22). Forventningerne er aflæst på siderne og i prislisten og står direkte i testene.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FITNESSX_CENTER_LIST_URL,
  FITNESSX_PRICE_LIST_URL,
  FITNESSX_SIGNUP_URL,
  buildOffer,
  listPriceFor,
  membershipsForCenter,
  offerNameFromTitle,
  offersForCenter,
  parseAmount,
  parseCampaignText,
  parseCenterList,
  parseCenterPage,
  parsePriceList,
  scrapeFitnessx,
} from './fitnessx.mjs';
import { isInDenmark, offerProblems } from '../sanity.mjs';
import { createFixtureHttp } from '../testing/satsFixtures.mjs';
import {
  FIXTURE_CENTERS,
  GUIDS,
  centerListWith,
  fitnessxFixture,
  fitnessxRoutes,
  membershipsTitled,
  withAjaxObject,
  withoutCenterLink,
} from '../testing/fitnessxFixtures.mjs';

const TODAY = '2026-10-22';
const VIBORG_URL = FIXTURE_CENTERS.Viborg.url;
const LINDGREENS_URL = FIXTURE_CENTERS['København S, Lindgreens Allé'].url;
const SKOMAGERGADE_URL = FIXTURE_CENTERS['Roskilde, Skomagergade'].url;

// Centrets Tilbud, som de skrives til databasen.
function offersFrom(html, center = { id: 'fitnessx-test', signupUrl: 'https://fitnessx.dk/x/' }) {
  const page = parseCenterPage(html);
  const { offers, warnings } = offersForCenter(page.ajaxObject, page.guid);
  return {
    offers: offers.map((draft) => buildOffer(center, draft, { today: TODAY })),
    warnings,
  };
}

const byName = (offers, name) => offers.find((offer) => offer.name === name);

const partnerText = (under30, over30, centers) =>
  `I deler ét medlemskab med Træningsven og betaler samlet ${under30} kr/md (under 30) eller ` +
  `${over30} kr/md (30+). Det koster 100 kr én gang at tilføje Træningsvennen. ` +
  `Medlemskabet giver jer begge adgang til ${centers}.`;

// Knytter de rigtige åbningstilbud til Centret. På siderne står de med skrald i acf.centre
// ("abc", "efg", []), så de vises ikke i dag; her simuleres, at Fitness X slår dem til igen.
const withOpeningOffers = (file, place, guid) =>
  withAjaxObject(fitnessxFixture(file), (ajaxObject) => {
    for (const membership of membershipsTitled(ajaxObject, new RegExp(`Åbningstilbud.*${place}`))) {
      membership.acf.centre = [guid];
    }
  });

describe('Fitness X centerliste', () => {
  const centers = parseCenterList(fitnessxFixture('find-center.html'));

  test("finder alle 33 Centre med unikke id'er", () => {
    assert.equal(centers.length, 33);
    assert.equal(new Set(centers.map((center) => center.id)).size, 33);
  });

  test('læser navn, adresse, koordinater, faciliteter, link og GUID for Ankersgade', () => {
    assert.deepEqual(centers[0], {
      guid: '45824a8c-6ffa-4a32-ba36-70d8cb0ebdef',
      id: 'fitnessx-aarhus-c-ankersgade',
      chainId: 'fitnessx',
      name: 'Fitness X Aarhus C, Ankersgade',
      address: 'Ankersgade 12, 8000 Aarhus C',
      location: { latitude: 56.14823, longitude: 10.1912 },
      facilities: { groupClasses: true, open24h: false },
      signupUrl: 'https://fitnessx.dk/fitness/fitness-aarhus/fitness-aarhus-c-ankersgade-12/',
    });
  });

  test('Hjørring: mellemrum i long=" 9.99105" og ekstra klasser på overskriften', () => {
    const hjoerring = centers.find((center) => center.id === 'fitnessx-hjoerring');
    assert.deepEqual(hjoerring.location, { latitude: 57.45752, longitude: 9.99105 });
    assert.equal(hjoerring.name, 'Fitness X Hjørring');
    assert.equal(hjoerring.address, 'Østergade 30, 9800 Hjørring');
    assert.equal(hjoerring.guid, GUIDS.hjoerring);
  });

  test('et tomt holdplan-link giver intet GUID (Lindgreens Allé)', () => {
    const lindgreens = centers.find((c) => c.id === 'fitnessx-koebenhavn-s-lindgreens-alle');
    assert.equal(lindgreens.guid, undefined);
    assert.equal(lindgreens.signupUrl, LINDGREENS_URL);
  });

  test('"Hold" markeret som ikke inkluderet er nej; sauna står der aldrig og er ukendt', () => {
    const brabrand = centers.find((center) => center.id === 'fitnessx-aarhus-brabrand');
    assert.deepEqual(brabrand.facilities, { groupClasses: false, open24h: false });
    for (const center of centers) assert.equal('sauna' in center.facilities, false, center.id);
  });

  test('alle Centre har adresse, link, GUID-format og koordinater i Danmark', () => {
    for (const center of centers) {
      assert.ok(center.name.startsWith('Fitness X '), center.id);
      assert.match(center.address, /^.+, \d{4} .+$/, center.id);
      assert.match(center.signupUrl, /^https:\/\/fitnessx\.dk\/fitness\//, center.id);
      assert.ok(isInDenmark(center.location), center.id);
      if (center.guid) assert.match(center.guid, /^[0-9a-f-]{36}$/, center.id);
    }
  });

  test('et Center uden "Se center"-link får intet link, men beholder resten', () => {
    const html = centerListWith(['Hjørring'], (_, item) => withoutCenterLink(item));
    const [hjoerring] = parseCenterList(html);
    assert.equal(hjoerring.signupUrl, undefined);
    assert.equal(hjoerring.guid, GUIDS.hjoerring);
    assert.equal(hjoerring.address, 'Østergade 30, 9800 Hjørring');
  });

  test('en side uden centerliste giver en tydelig fejl', () => {
    assert.throws(() => parseCenterList('<html>Vedligehold</html>'), /ingen centerliste/);
  });
});

describe('Fitness X centerside: Tilbud pr. Aldersgruppe', () => {
  test('Viborg: Kategori 2 (360/400) og Kategori 1 (400/450) med Træningsven', () => {
    const { offers, warnings } = offersFrom(fitnessxFixture('center-viborg.html'));
    assert.deepEqual(warnings, []);
    const common = {
      campaignPrice: null,
      campaignMonths: 0,
      signupFee: 60,
      adminFee: 15,
      bindingMonths: 0,
      signupUrl: 'https://fitnessx.dk/x/',
    };
    assert.deepEqual(offers, [
      {
        id: 'fitnessx-test-kategori-2',
        name: 'Kategori 2',
        subscriptionType: 'Landsdækkende',
        standardPrice: { under30: 360, over30: 400 },
        ...common,
        partnerPrice: 300,
        partnerRequirement: partnerText(560, 600, '31 Centre'),
      },
      {
        id: 'fitnessx-test-kategori-1',
        name: 'Kategori 1',
        subscriptionType: 'Landsdækkende',
        standardPrice: { under30: 400, over30: 450 },
        ...common,
        partnerPrice: 325,
        partnerRequirement: partnerText(600, 650, '33 Centre'),
      },
    ]);
  });

  test('Kategori 1 koster 400 kr under 30 og 450 kr for 30+ i alle fem Centre', () => {
    for (const { file } of Object.values(FIXTURE_CENTERS)) {
      const kategori1 = byName(offersFrom(fitnessxFixture(file)).offers, 'Kategori 1');
      assert.deepEqual(kategori1.standardPrice, { under30: 400, over30: 450 }, file);
      assert.equal(kategori1.partnerPrice, 325, file);
    }
  });

  test('Carlsberg Byen har kun Kategori 1', () => {
    const { offers } = offersFrom(fitnessxFixture('center-kbh-carlsberg.html'));
    assert.deepEqual(offers.map((offer) => offer.name), ['Kategori 1']);
  });

  test('Ankersgade: Reformer-Tilbud og Aarhus-særprisen som billigste Makkerpris', () => {
    const { offers } = offersFrom(fitnessxFixture('center-aarhus-ankersgade.html'));
    assert.deepEqual(
      offers.map((offer) => [offer.name, offer.standardPrice, offer.partnerPrice]),
      [
        ['Kategori 2', { under30: 360, over30: 400 }, 275],
        ['Kategori 2 + Reformer', { under30: 510, over30: 600 }, 475],
        ['Kategori 1', { under30: 400, over30: 450 }, 325],
        ['Kategori 1 + Reformer', { under30: 550, over30: 650 }, 525],
      ],
    );
    // Særprisen i Aarhus (500/550 for to) giver kun adgang til 9 Centre; det står i kravet.
    assert.equal(
      byName(offers, 'Kategori 2').partnerRequirement,
      partnerText(500, 550, '9 Centre'),
    );
    // Beløb over 1.000 uden punktum ("1050") læses rigtigt.
    assert.equal(
      byName(offers, 'Kategori 1 + Reformer').partnerRequirement,
      partnerText(900, 1050, '33 Centre'),
    );
  });

  test('Skomagergade: Kategori 3 (330/360) og opgraderingen til Kategori 2', () => {
    const { offers } = offersFrom(fitnessxFixture('center-roskilde-skomagergade.html'));
    assert.deepEqual(
      offers.map((offer) => [offer.name, offer.standardPrice, offer.partnerPrice]),
      [
        ['Kategori 3', { under30: 330, over30: 360 }, 280],
        ['Kategori 2', { under30: 360, over30: 400 }, 300],
        ['Kategori 1', { under30: 400, over30: 450 }, 325],
      ],
    );
  });

  test('alle almindelige Tilbud består sanity-reglerne med begge Aldersgrupper', () => {
    for (const { file } of Object.values(FIXTURE_CENTERS)) {
      for (const offer of offersFrom(fitnessxFixture(file)).offers) {
        assert.deepEqual(offerProblems(offer), [], `${file}: ${offer.name}`);
        assert.ok(offer.standardPrice.under30 <= offer.standardPrice.over30, offer.name);
      }
    }
  });

  test('medlemskaber med skrald i acf.centre ("abc", "efg", "123", []) knyttes aldrig', () => {
    for (const { file } of Object.values(FIXTURE_CENTERS)) {
      const page = parseCenterPage(fitnessxFixture(file));
      const titles = membershipsForCenter(page.ajaxObject, page.guid).map((m) => m.title);
      assert.ok(titles.length > 0, file);
      for (const title of titles) assert.doesNotMatch(title, /Åbningstilbud|UMEUS/, file);
    }
    // Fixturen har faktisk skraldet med.
    const { ajaxObject } = parseCenterPage(fitnessxFixture('center-viborg.html'));
    const junk = ajaxObject.medlemskaber.map((m) => JSON.stringify(m.acf.centre));
    for (const value of ['["abc"]', '["efg"]', '["123"]', '[]']) assert.ok(junk.includes(value));
  });

  test('GUID matches uden hensyn til store og små bogstaver; centre som tekst ignoreres', () => {
    const ajaxObject = {
      medlemskaber: [
        { id: 1, acf: { centre: [GUIDS.viborg.toUpperCase()] } },
        { id: 2, acf: { centre: GUIDS.viborg } },
        { id: 3, acf: { centre: null } },
        { id: 4 },
      ],
    };
    assert.deepEqual(membershipsForCenter(ajaxObject, GUIDS.viborg).map((m) => m.id), [1]);
  });

  test('et medlemskab uden Aldersgruppe (lukket beboertilbud) springes over med advarsel', () => {
    const html = withAjaxObject(fitnessxFixture('center-viborg.html'), (ajaxObject) => {
      const [umeus] = membershipsTitled(ajaxObject, /^UMEUS/);
      umeus.acf.centre = [GUIDS.viborg];
    });
    const { offers, warnings } = offersFrom(html);
    assert.deepEqual(offers.map((offer) => offer.name), ['Kategori 2', 'Kategori 1']);
    assert.deepEqual(warnings, [
      'UMEUS – Grønttorvet – 270 kr./md.: ingen Aldersgruppe, springes over',
    ]);
  });

  test('siden kender sit eget GUID og sin synlige adresse', () => {
    const page = parseCenterPage(fitnessxFixture('center-kbh-carlsberg.html'));
    assert.equal(page.guid, GUIDS.carlsberg);
    assert.equal(page.address, 'Thorvald Bindesbølls Pl. 1, 1799 København V');
  });

  test('en side uden sj_ajax_object giver en tydelig fejl', () => {
    assert.throws(() => parseCenterPage('<html>Ny side</html>'), /ingen sj_ajax_object/);
  });
});

describe('Fitness X Træningsven = Træn med en makker (Makkerpris)', () => {
  test('Makkerpris er 30+-prisen pr. person, så den aldrig bliver for lav', () => {
    const viborg = offersFrom(fitnessxFixture('center-viborg.html')).offers;
    // Kategori 2 med Træningsven: 560 (under 30) / 600 (30+) for to = 280 / 300 pr. person.
    assert.equal(byName(viborg, 'Kategori 2').partnerPrice, 300);
  });

  test('Hjørring har kun Kategori 5 med Træningsven; den bliver et selvstændigt Tilbud', () => {
    const { ajaxObject } = parseCenterPage(fitnessxFixture('center-viborg.html'));
    const { offers } = offersForCenter(ajaxObject, GUIDS.hjoerring);
    const [offer] = offers.map((draft) =>
      buildOffer({ id: 'fitnessx-hjoerring', signupUrl: FITNESSX_SIGNUP_URL }, draft, {
        today: TODAY,
      }),
    );
    assert.equal(offers.length, 1);
    assert.deepEqual(offer, {
      id: 'fitnessx-hjoerring-kategori-5-traeningsven',
      name: 'Kategori 5 + Træningsven',
      subscriptionType: 'Lokal center',
      // Prisen for to: man kan kun købe det sammen med en Træningsven.
      standardPrice: { under30: 300, over30: 350 },
      campaignPrice: null,
      campaignMonths: 0,
      signupFee: 60,
      adminFee: 15,
      bindingMonths: 0,
      partnerPrice: 175,
      partnerRequirement: partnerText(300, 350, 'ét Center'),
      signupUrl: FITNESSX_SIGNUP_URL,
    });
  });
});

describe('Fitness X kampagner i fri tekst', () => {
  test('format A: "189 kr./md. frem til 31. december 2026. Herefter 360 kr./md."', () => {
    const html = withOpeningOffers(
      'center-kbh-lindgreens-alle.html',
      'Drop 3.*Lindgreens',
      GUIDS.lindgreens,
    );
    const { offers, warnings } = offersFrom(html);
    assert.deepEqual(warnings, []);
    assert.deepEqual(byName(offers, 'Åbningstilbud – Drop 3'), {
      id: 'fitnessx-test-aabningstilbud-drop-3',
      name: 'Åbningstilbud – Drop 3',
      subscriptionType: 'Lokal center',
      standardPrice: { under30: 360, over30: 400 },
      campaignPrice: 189,
      // 22/10 → 22/12 er to hele måneder; 22/1 ligger efter 31/12.
      campaignMonths: 2,
      campaignEndDate: '2026-12-31',
      campaignText:
        'Træn for kun 189 kr./md. frem til 31. december 2026. Herefter 360 kr./md.',
      signupFee: 60,
      adminFee: 15,
      bindingMonths: 0,
      partnerPrice: null,
      signupUrl: 'https://fitnessx.dk/x/',
    });
    // De almindelige Tilbud er urørte.
    assert.equal(byName(offers, 'Kategori 2').campaignPrice, null);
  });

  test('format B: acf.pris er Kampagneprisen, Standardprisen står i teksten', () => {
    const html = withOpeningOffers(
      'center-roskilde-skomagergade.html',
      'Drop [12].*Skomagergade',
      GUIDS.skomagergade,
    );
    const { offers, warnings } = offersFrom(html);
    assert.deepEqual(warnings, []);
    const drop1 = byName(offers, 'Åbningstilbud – Drop 1');
    // "Herefter 330/360 kr./md. (over/under 30 år)": teksten bytter om på rækkefølgen, men den
    // laveste pris er under 30 (som Kategori 3 i Centret: 330/360).
    assert.deepEqual(drop1.standardPrice, { under30: 330, over30: 360 });
    assert.equal(drop1.campaignPrice, 149);
    assert.equal(drop1.campaignMonths, 2);
    assert.equal(drop1.campaignEndDate, '2026-12-31');
    assert.equal(drop1.subscriptionType, 'Lokal center');
    assert.deepEqual(offerProblems(drop1), []);
    assert.equal(byName(offers, 'Åbningstilbud – Drop 2').campaignPrice, 169);
  });

  test('et åbningstilbud uden antal Centre mangler Abonnementstype og fejler sanity', () => {
    // Lindgreens Allés "Drop 1" har antal_centre = "" på siden.
    const html = withOpeningOffers(
      'center-kbh-lindgreens-alle.html',
      'Drop 1.*Lindgreens',
      GUIDS.lindgreens,
    );
    const drop1 = byName(offersFrom(html).offers, 'Åbningstilbud – Drop 1');
    assert.equal(drop1.campaignPrice, 149);
    assert.deepEqual(drop1.standardPrice, { under30: 360, over30: 400 });
    assert.deepEqual(offerProblems(drop1), ['Tilbuddet mangler subscriptionType']);
  });

  test('en udløbet kampagne regnes ikke med; Standardprisen står tilbage', () => {
    const html = withOpeningOffers(
      'center-kbh-lindgreens-alle.html',
      'Drop 3.*Lindgreens',
      GUIDS.lindgreens,
    );
    const page = parseCenterPage(html);
    const draft = offersForCenter(page.ajaxObject, page.guid).offers[0];
    const offer = buildOffer({ id: 'x', signupUrl: 'u' }, draft, { today: '2026-12-05' });
    assert.equal(offer.campaignPrice, null);
    assert.equal(offer.campaignMonths, 0);
    assert.equal('campaignEndDate' in offer, false);
    assert.deepEqual(offer.standardPrice, { under30: 360, over30: 400 });
  });

  test('"Herefter"-pris, der ikke passer med acf.pris, giver en advarsel', () => {
    const html = withAjaxObject(fitnessxFixture('center-kbh-lindgreens-alle.html'), (object) => {
      for (const membership of membershipsTitled(object, /Drop 3.*Lindgreens/)) {
        membership.acf.centre = [GUIDS.lindgreens];
        membership.acf.pris = String(Number(membership.acf.pris) + 10);
      }
    });
    const { warnings } = offersFrom(html);
    assert.deepEqual(warnings, [
      'Åbningstilbud – Drop 3: kampagneteksten siger "herefter 360 kr", men prisen er 370 kr',
      'Åbningstilbud – Drop 3: kampagneteksten siger "herefter 400 kr", men prisen er 410 kr',
    ]);
  });

  test('ulæselig kampagnetekst giver advarsel og intet Tilbud frem for en gættet pris', () => {
    const html = withAjaxObject(fitnessxFixture('center-kbh-lindgreens-alle.html'), (object) => {
      for (const membership of membershipsTitled(object, /Drop 3.*Lindgreens/)) {
        membership.acf.centre = [GUIDS.lindgreens];
        membership.acf.beskrivelse = 'Træn for kun 189 kr./md. frem til jul. Herefter normalpris.';
      }
    });
    const { offers, warnings } = offersFrom(html);
    assert.equal(byName(offers, 'Åbningstilbud – Drop 3'), undefined);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /^Åbningstilbud – Drop 3: Kampagnen kunne ikke læses/);
  });

  test('tekstvarianter: dato med ord eller tal, og tekst der ikke er en kampagne', () => {
    assert.deepEqual(
      parseCampaignText(
        'Træn for kun <strong>189 kr./md.</strong> frem til 31. december 2026. ' +
          'Herefter 360 kr./md. ',
      ),
      { format: 'A', price: 189, endDate: '2026-12-31', after: 360 },
    );
    assert.deepEqual(parseCampaignText('Kun 99 kr./md. frem til 15.01.27. Herefter 400 kr./md.'), {
      format: 'A',
      price: 99,
      endDate: '2027-01-15',
      after: 400,
    });
    assert.deepEqual(
      parseCampaignText(
        'Tilbuddet gælder resten af 2026. Herefter 360/400 kr./md. (over/under 30 år).',
      ),
      { format: 'B', endDate: '2026-12-31', after: { under30: 360, over30: 400 } },
    );
    // Almindelige beskrivelser og en reformer-kampagne uden prisændring er ikke kampagner.
    assert.equal(parseCampaignText('Få fri adgang til <span>xxx</span> og 30 andre centre.'), null);
    assert.equal(
      parseCampaignText(
        'Lige nu får du adgang til gratis reformerhold, på Fasanvej, ' +
          'helt frem til 1. marts 2027. ' +
          'Få fri adgang til xxx og 32 andre centre. Træn to for kun 650 kr./md.',
      ),
      null,
    );
    assert.equal(parseCampaignText(undefined), null);
    assert.throws(
      () => parseCampaignText('Træn for 99 kr./md. frem til 1. smarch 2027.'),
      /Ukendt måned/,
    );
  });
});

describe('Fitness X navne og tal', () => {
  test('Tilbuddets navn uden Aldersgruppe, by og "NYT"', () => {
    const cases = {
      'Kategori 2 &#8211; Under 30 (Aarhus) NYT': 'Kategori 2',
      'Kategori 2 + Reformer U/30 (Aarhus) NYT': 'Kategori 2 + Reformer',
      'Kategori 1 O/30 &#8211; NYT': 'Kategori 1',
      'Kategori 3 Fri Reformer &#8211; U/30 NYT': 'Kategori 3 Fri Reformer',
      'Kategori 3 &#8211; Over 30 (+ Randers, Vestergrave)': 'Kategori 3',
      'Åbningstilbud &#8211; Drop 3 &#8211; U/30 (Lindgreens Allé)': 'Åbningstilbud – Drop 3',
      'Kategori 2 Aarhus med TV &#8211; O30': 'Kategori 2 Aarhus med TV',
    };
    for (const [title, name] of Object.entries(cases)) {
      assert.equal(offerNameFromTitle(title), name, title);
    }
  });

  test('beløb med og uden tusindtalspunktum', () => {
    assert.equal(parseAmount('1050'), 1050);
    assert.equal(parseAmount('1.200 kr.'), 1200);
    assert.equal(parseAmount('189,50'), 189.5);
    assert.equal(parseAmount('60'), 60);
    assert.equal(parseAmount(''), null);
    assert.equal(parseAmount(null), null);
  });
});

describe('Fitness X prisliste (gebyrsiden)', () => {
  const priceList = parsePriceList(fitnessxFixture('oevrige-priser.html'));

  test('Opstartsgebyr 60 kr og Administrationsgebyr 15 kr', () => {
    assert.equal(priceList.signupFee, 60);
    assert.equal(priceList.adminFee, 15);
  });

  test('priser pr. Kategori, Aldersgruppe, Reformer og Træningsven', () => {
    const price = (category, ageGroup, extra = {}) =>
      listPriceFor(priceList, {
        category,
        ageGroup,
        reformer: false,
        partner: false,
        special: false,
        ...extra,
      });
    assert.equal(price(1, 'under30'), 400);
    assert.equal(price(1, 'over30'), 450);
    assert.equal(price(2, 'under30'), 360);
    assert.equal(price(4, 'over30'), 350);
    assert.equal(price(2, 'over30', { partner: true }), 600);
    assert.equal(price(5, 'under30', { partner: true }), 300);
    assert.equal(price(1, 'over30', { reformer: true, partner: true }), 1050);
    assert.equal(price(3, 'under30', { reformer: true }), 480);
    assert.equal(price(2, 'under30', { partner: true, special: true }), 500);
    // Særmedlemskabet "Aarhus med Træningsven inkl. reformer" har ingen Kategori i etiketten.
    assert.equal(price(2, 'over30', { reformer: true, partner: true, special: true }), 950);
    assert.equal(price(5, 'under30'), undefined);
  });
});

describe('hele Fitness X-kørslen (falsk HTTP med gemte svar)', () => {
  test('giver Kæden og de forventede Centre, også Hjørring uden link', async () => {
    const http = createFixtureHttp(fitnessxRoutes());
    const result = await scrapeFitnessx({ http, today: TODAY });

    assert.deepEqual(result.readErrors, []);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(result.chain, {
      id: 'fitnessx',
      name: 'Fitness X',
      website: 'https://fitnessx.dk',
      discounts: [],
    });
    assert.deepEqual(
      result.centers.map((center) => [center.id, center.offers.length]),
      [
        ['fitnessx-aarhus-c-ankersgade', 4],
        ['fitnessx-hjoerring', 1],
        ['fitnessx-koebenhavn-s-lindgreens-alle', 4],
        ['fitnessx-koebenhavn-v-carlsberg-byen', 1],
        ['fitnessx-roskilde-skomagergade', 3],
        ['fitnessx-viborg', 2],
      ],
    );

    const viborg = result.centers.at(-1);
    assert.deepEqual(
      { ...viborg, offers: undefined },
      {
        id: 'fitnessx-viborg',
        chainId: 'fitnessx',
        name: 'Fitness X Viborg',
        address: 'Tingvej 7, 8800 Viborg',
        location: { latitude: 56.45512941118191, longitude: 9.402475098967916 },
        facilities: { groupClasses: true, open24h: false },
        signupUrl: VIBORG_URL,
        offers: undefined,
      },
    );
    assert.equal(viborg.offers[0].id, 'fitnessx-viborg-kategori-2');
    assert.equal(viborg.offers[0].signupUrl, VIBORG_URL);

    // Hjørring prissættes ud fra de andre centersider og får Kædens tilmeldingsside som link.
    const hjoerring = result.centers[1];
    assert.equal(hjoerring.signupUrl, FITNESSX_SIGNUP_URL);
    assert.equal(hjoerring.offers[0].name, 'Kategori 5 + Træningsven');
    assert.equal(hjoerring.offers[0].partnerPrice, 175);
  });

  test('er høflig: centerliste, prisliste og én side pr. Center med link (7 kald)', async () => {
    const http = createFixtureHttp(fitnessxRoutes());
    await scrapeFitnessx({ http, today: TODAY });

    assert.deepEqual(http.requests, [
      FITNESSX_CENTER_LIST_URL,
      FITNESSX_PRICE_LIST_URL,
      FIXTURE_CENTERS['Aarhus C, Ankersgade'].url,
      LINDGREENS_URL,
      FIXTURE_CENTERS['København V, Carlsberg Byen'].url,
      SKOMAGERGADE_URL,
      VIBORG_URL,
    ]);
  });

  test('limit henter kun de første Centre (live-tjek med få kald)', async () => {
    const http = createFixtureHttp(fitnessxRoutes());
    const result = await scrapeFitnessx({ http, today: TODAY, limit: 1 });
    assert.deepEqual(result.centers.map((center) => center.id), ['fitnessx-aarhus-c-ankersgade']);
    assert.equal(http.requests.length, 3);
  });

  test('en centerside, der fejler, bliver en læsefejl for netop det Center', async () => {
    const routes = fitnessxRoutes();
    routes[VIBORG_URL] = new Error('HTTP 500');
    const result = await scrapeFitnessx({ http: createFixtureHttp(routes), today: TODAY });

    assert.deepEqual(result.readErrors, [{ centerId: 'fitnessx-viborg', message: 'HTTP 500' }]);
    assert.equal(result.centers.length, 5);
  });

  test('en centerside for et andet Center end forventet afvises', async () => {
    const routes = fitnessxRoutes();
    routes[VIBORG_URL] = fitnessxFixture('center-kbh-carlsberg.html');
    const result = await scrapeFitnessx({ http: createFixtureHttp(routes), today: TODAY });

    assert.deepEqual(result.readErrors, [
      {
        centerId: 'fitnessx-viborg',
        message: `Centersiden er for GUID ${GUIDS.carlsberg}, ikke ${GUIDS.viborg}`,
      },
    ]);
  });

  test('et Center uden link og uden GUID kan ikke prissættes og bliver en læsefejl', async () => {
    const routes = fitnessxRoutes();
    routes[FITNESSX_CENTER_LIST_URL] = centerListWith(['Viborg', 'Hjørring'], (name, item) =>
      name === 'Hjørring'
        ? withoutCenterLink(item).replace(/DepartmentId=[0-9a-f-]+/, 'DepartmentId=')
        : item,
    );
    const result = await scrapeFitnessx({ http: createFixtureHttp(routes), today: TODAY });

    assert.deepEqual(result.readErrors, [
      {
        centerId: 'fitnessx-hjoerring',
        message: 'Centret har hverken link til centersiden eller GUID i centerlisten',
      },
    ]);
    assert.deepEqual(result.centers.map((center) => center.id), ['fitnessx-viborg']);
  });

  test('kan prislisten ikke læses, bruges gebyrerne fra medlemskaberne, med advarsel', async () => {
    const routes = { ...fitnessxRoutes(), [FITNESSX_PRICE_LIST_URL]: new Error('HTTP 503') };
    const result = await scrapeFitnessx({ http: createFixtureHttp(routes), today: TODAY });

    assert.deepEqual(result.warnings, ['Prislisten kunne ikke læses: HTTP 503']);
    assert.equal(result.centers[0].offers[0].signupFee, 60);
    assert.equal(result.centers[0].offers[0].adminFee, 15);
  });

  test('gebyrer, der afviger fra prislisten, giver en advarsel', async () => {
    const routes = fitnessxRoutes();
    routes[VIBORG_URL] = withAjaxObject(routes[VIBORG_URL], (ajaxObject) => {
      for (const membership of membershipsTitled(ajaxObject, /^Kategori 2 &#8211;/)) {
        membership.acf.opstartsgebyr = '99';
      }
    });
    const result = await scrapeFitnessx({ http: createFixtureHttp(routes), today: TODAY });

    assert.deepEqual(result.warnings, [
      'Fitness X Viborg / Kategori 2: Oprettelsesgebyr 99 kr, prislisten siger 60 kr',
    ]);
    assert.equal(result.centers.at(-1).offers[0].signupFee, 99);
  });

  test('kan centerlisten ikke hentes eller læses, fejler hele kørslen', async () => {
    const failing = { ...fitnessxRoutes(), [FITNESSX_CENTER_LIST_URL]: new Error('HTTP 502') };
    await assert.rejects(
      scrapeFitnessx({ http: createFixtureHttp(failing), today: TODAY }),
      /HTTP 502/,
    );
    const changed = { ...fitnessxRoutes(), [FITNESSX_CENTER_LIST_URL]: '<html>Ny side</html>' };
    await assert.rejects(
      scrapeFitnessx({ http: createFixtureHttp(changed), today: TODAY }),
      /ingen centerliste/,
    );
  });
});
