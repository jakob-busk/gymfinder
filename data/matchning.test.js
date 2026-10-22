import { matchCenters } from './matchning';

// Adfærdstests for Matchning. Alle tal i forventningerne er regnet ud på forhånd.
// Testene kender kun til snitfladen matchCenters(input) -> { centers, recommendedId, ... }.

const TODAY = '2026-10-22';
const HOME = { latitude: 55.6761, longitude: 12.5683 }; // Rådhuspladsen, København

// Et punkt ca. `km` kilometer nord for HOME (1 breddegrad ≈ 111,19 km).
function north(km) {
  return { latitude: HOME.latitude + km / 111.19, longitude: HOME.longitude };
}

function chain(overrides = {}) {
  return { id: 'kaede', name: 'Kæde', website: 'https://example.dk', discounts: [], ...overrides };
}

function offer(overrides = {}) {
  return {
    id: 'tilbud',
    name: 'Basis',
    subscriptionType: 'Lokal center',
    standardPrice: 300,
    campaignPrice: null,
    campaignMonths: 0,
    signupFee: 0,
    adminFee: 0,
    bindingMonths: 0,
    partnerPrice: null,
    ...overrides,
  };
}

function center(overrides = {}) {
  return {
    id: 'center',
    chainId: 'kaede',
    name: 'Center',
    address: 'Gaden 1, 1000 København',
    location: HOME,
    facilities: { sauna: true, groupClasses: true, open24h: true },
    machines: ['Bænkpres', 'Løbebånd', 'Squat rack'],
    signupUrl: 'https://example.dk/tilmeld',
    offers: [offer()],
    ...overrides,
  };
}

function user(overrides = {}) {
  return { birthDate: '2000-01-01', discountProfile: [], currentMembership: null, ...overrides };
}

function run(overrides = {}) {
  return matchCenters({
    centers: [center()],
    chains: [chain()],
    user: user(),
    filters: {},
    sortBy: 'honestYearlyPrice',
    location: HOME,
    today: TODAY,
    ...overrides,
  });
}

// Kører Matchning med ét Center med ét Tilbud og returnerer det billigste Tilbud for brugeren.
function priceSingleOffer(offerOverrides, { chainOverrides, userOverrides } = {}) {
  const result = run({
    centers: [center({ offers: [offer(offerOverrides)] })],
    chains: [chain(chainOverrides)],
    user: user(userOverrides),
  });
  return result.centers[0].bestOffer;
}

describe('Ærlig årspris og Kvartalspris', () => {
  test('uden gebyrer og kampagne er begge lig Standardprisen', () => {
    const best = priceSingleOffer({ standardPrice: 300 });
    expect(best.honestYearlyPrice).toBeCloseTo(300);
    expect(best.quarterlyPrice).toBeCloseTo(300);
  });

  test('Oprettelsesgebyr fordeles og Admingebyr lægges oven i hver måned', () => {
    // År: (300 + 12 * (200 + 20)) / 12 = 2940 / 12 = 245
    // Kvartal: (300 + 3 * 220) / 3 = 960 / 3 = 320
    const best = priceSingleOffer({ standardPrice: 200, signupFee: 300, adminFee: 20 });
    expect(best.honestYearlyPrice).toBeCloseTo(245);
    expect(best.quarterlyPrice).toBeCloseTo(320);
  });

  test('Kampagnepris gælder i Kampagneperioden, derefter Standardpris', () => {
    // År: (3 * 99 + 9 * 299) / 12 = 2988 / 12 = 249. Kvartal: 99
    const best = priceSingleOffer({ standardPrice: 299, campaignPrice: 99, campaignMonths: 3 });
    expect(best.honestYearlyPrice).toBeCloseTo(249);
    expect(best.quarterlyPrice).toBeCloseTo(99);
    expect(best.yearlyOption.kind).toBe('campaign');
  });

  test('Kampagneperiode kortere end et kvartal', () => {
    // Kvartal: (2 * 99 + 299) / 3 = 165,67
    const best = priceSingleOffer({ standardPrice: 299, campaignPrice: 99, campaignMonths: 2 });
    expect(best.quarterlyPrice).toBeCloseTo(165.667, 2);
  });

  test('månedsudregningen viser 12 måneder inkl. Admingebyr og Oprettelsesgebyr', () => {
    const best = priceSingleOffer({
      standardPrice: 299,
      campaignPrice: 99,
      campaignMonths: 3,
      adminFee: 10,
      signupFee: 199,
    });
    expect(best.monthlyBreakdown).toHaveLength(12);
    expect(best.monthlyBreakdown[0]).toMatchObject({
      month: 1,
      price: 99,
      adminFee: 10,
      total: 109,
      kind: 'campaign',
    });
    expect(best.monthlyBreakdown[3]).toMatchObject({
      month: 4,
      price: 299,
      adminFee: 10,
      total: 309,
      kind: 'standard',
    });
    expect(best.signupFee).toBe(199);
  });
});

describe('Betalingsinterval', () => {
  // Opkræves der pr. 30 dage, betales der 365 / 30 ≈ 12,17 gange om året.
  test('betaling pr. 30 dage giver ca. 12,17 betalinger i Ærlig årspris', () => {
    // År: (199 + 299 * 365 / 30) / 12 = (199 + 3637,83) / 12 = 319,74
    // Kvartal: (199 + 299 * 91,25 / 30) / 3 = (199 + 909,46) / 3 = 369,49
    const best = priceSingleOffer({
      standardPrice: 289,
      adminFee: 10,
      signupFee: 199,
      billingIntervalDays: 30,
    });
    expect(best.honestYearlyPrice).toBeCloseTo(319.736, 2);
    expect(best.quarterlyPrice).toBeCloseTo(369.486, 2);
    expect(best.paymentsPerYear).toBeCloseTo(12.167, 2);
    expect(best.monthlyBreakdown).toHaveLength(13);
  });

  test('kampagne regnes i betalingsperioder', () => {
    // 3 perioder à 100, resten 299: (3 * 100 + 9,1667 * 299) / 12 = (300 + 2740,83) / 12 = 253,40
    const best = priceSingleOffer({
      standardPrice: 299,
      campaignPrice: 100,
      campaignMonths: 3,
      billingIntervalDays: 30,
    });
    expect(best.honestYearlyPrice).toBeCloseTo(253.403, 2);
  });

  test('uden betalingsinterval betales der pr. måned', () => {
    expect(priceSingleOffer({ standardPrice: 300 }).paymentsPerYear).toBe(12);
  });
});

describe('Kampagne og Rabatter lægges aldrig sammen', () => {
  test('den billigste mulighed vælges uafhængigt for 12 og 3 måneder', () => {
    // Uden rabat: år (3 * 100 + 9 * 300) / 12 = 250, kvartal 100
    // Studierabat 25 %: 225 hele året. Lagt sammen ville året give 187,5 - det må ikke ske.
    const best = priceSingleOffer(
      { standardPrice: 300, campaignPrice: 100, campaignMonths: 3 },
      {
        chainOverrides: { discounts: [{ discountGroup: 'student', percentOff: 25 }] },
        userOverrides: { discountProfile: ['student'] },
      },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(225);
    expect(best.yearlyOption).toMatchObject({ kind: 'discount', discountGroup: 'student' });
    expect(best.quarterlyPrice).toBeCloseTo(100);
    expect(best.quarterlyOption.kind).toBe('campaign');
  });

  test('flere Rabatter lægges ikke sammen; den billigste vinder', () => {
    // Studerende 249 fast, Ældre Sagen 10 % af 299 = 269,1. Sammenlagt ville give 224,1.
    const best = priceSingleOffer(
      { standardPrice: 299 },
      {
        chainOverrides: {
          discounts: [
            { discountGroup: 'student', price: 249 },
            { discountGroup: 'aeldreSagen', percentOff: 10 },
          ],
        },
        userOverrides: { discountProfile: ['student', 'aeldreSagen'] },
      },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(249);
    expect(best.yearlyOption.discountGroup).toBe('student');
  });

  test('Rabatter for Rabatgrupper brugeren ikke tilhører, tælles ikke med', () => {
    const best = priceSingleOffer(
      { standardPrice: 299 },
      { chainOverrides: { discounts: [{ discountGroup: 'senior', price: 149 }] } },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(299);
    expect(best.yearlyOption.kind).toBe('standard');
  });

  test('Rabat med Rabatperiode gælder kun de første måneder', () => {
    // (6 * 149 + 6 * 299) / 12 = 224
    const best = priceSingleOffer(
      { standardPrice: 299 },
      {
        chainOverrides: { discounts: [{ discountGroup: 'student', price: 149, months: 6 }] },
        userOverrides: { discountProfile: ['student'] },
      },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(224);
  });

  test('Rabat begrænset til en Abonnementstype gælder ikke for andre', () => {
    const best = priceSingleOffer(
      { standardPrice: 399, subscriptionType: 'Landsdækkende' },
      {
        chainOverrides: {
          discounts: [
            { discountGroup: 'student', price: 199, subscriptionTypes: ['Lokal center'] },
          ],
        },
        userOverrides: { discountProfile: ['student'] },
      },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(399);
  });

  test('Rabat kan have forskellig sats pr. Tilbud (fx Core 15 %, Unlimited 25 %)', () => {
    const pureGym = chain({
      discounts: [
        { discountGroup: 'aeldreSagen', percentOff: 15, offerNames: ['Core'], signupFee: 0 },
        { discountGroup: 'aeldreSagen', percentOff: 25, offerNames: ['Unlimited'], signupFee: 0 },
      ],
    });
    const result = run({
      centers: [
        center({
          offers: [
            offer({ id: 'core', name: 'Core', standardPrice: 300, signupFee: 99 }),
            offer({ id: 'unlimited', name: 'Unlimited', standardPrice: 400, signupFee: 99 }),
            offer({ id: 'plus', name: 'Plus', standardPrice: 350, signupFee: 99 }),
          ],
        }),
      ],
      chains: [pureGym],
      user: user({ discountProfile: ['aeldreSagen'] }),
    });
    const byOffer = Object.fromEntries(result.centers[0].offers.map((o) => [o.offer.id, o]));
    // Core: 300 * 0,85 = 255, Unlimited: 400 * 0,75 = 300, begge uden Oprettelsesgebyr
    expect(byOffer.core.honestYearlyPrice).toBeCloseTo(255);
    expect(byOffer.core.signupFee).toBe(0);
    expect(byOffer.unlimited.honestYearlyPrice).toBeCloseTo(300);
    // Plus er ikke omfattet: (99 + 12 * 350) / 12 = 358,25
    expect(byOffer.plus.honestYearlyPrice).toBeCloseTo(358.25);
  });

  test('Rabat kan give gratis Oprettelsesgebyr', () => {
    // Uden rabat: (299 + 12 * 249) / 12 = 273,92. Studerende: (0 + 12 * 249) / 12 = 249
    const best = priceSingleOffer(
      { standardPrice: 249, signupFee: 299 },
      {
        chainOverrides: { discounts: [{ discountGroup: 'student', percentOff: 0, signupFee: 0 }] },
        userOverrides: { discountProfile: ['student'] },
      },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(249);
    expect(best.signupFee).toBe(0);
  });
});

describe('Aldersgruppe', () => {
  const agePrices = { standardPrice: { under30: 199, over30: 249 } };

  test('under 30 hele året giver under 30-prisen', () => {
    const best = priceSingleOffer(agePrices, { userOverrides: { birthDate: '2000-01-01' } });
    expect(best.honestYearlyPrice).toBeCloseTo(199);
    expect(best.turns30InMonth).toBeNull();
  });

  test('30+ giver 30+-prisen', () => {
    const best = priceSingleOffer(agePrices, { userOverrides: { birthDate: '1980-06-01' } });
    expect(best.honestYearlyPrice).toBeCloseTo(249);
  });

  test('fylder brugeren 30 i vinduet, bruges 30+-prisen fra den måned', () => {
    // Fylder 30 d. 15/1-2027, som ligger i måned 3 (22/12-2026 til 22/1-2027).
    // År: (2 * 199 + 10 * 249) / 12 = 2888 / 12 = 240,67. Kvartal: (2 * 199 + 249) / 3 = 215,67
    const best = priceSingleOffer(agePrices, { userOverrides: { birthDate: '1997-01-15' } });
    expect(best.honestYearlyPrice).toBeCloseTo(240.667, 2);
    expect(best.quarterlyPrice).toBeCloseTo(215.667, 2);
    expect(best.turns30InMonth).toBe(3);
    expect(best.monthlyBreakdown[1]).toMatchObject({ price: 199, ageGroup: 'under30' });
    expect(best.monthlyBreakdown[2]).toMatchObject({ price: 249, ageGroup: 'over30' });
  });

  test('fylder brugeren 30 i dag, gælder 30+-prisen fra første måned', () => {
    const best = priceSingleOffer(agePrices, { userOverrides: { birthDate: '1996-10-22' } });
    expect(best.honestYearlyPrice).toBeCloseTo(249);
  });

  test('procent-Rabat regnes af den Standardpris, Aldersgruppen giver', () => {
    // 20 % af (2 * 199 + 10 * 249) / 12 = 240,67 * 0,8 = 192,53
    const best = priceSingleOffer(agePrices, {
      chainOverrides: { discounts: [{ discountGroup: 'student', percentOff: 20 }] },
      userOverrides: { birthDate: '1997-01-15', discountProfile: ['student'] },
    });
    expect(best.honestYearlyPrice).toBeCloseTo(192.533, 2);
  });
});

describe('Træn med en makker', () => {
  const partnerOffer = {
    standardPrice: 299,
    campaignPrice: 149,
    campaignMonths: 3,
    partnerPrice: 199,
    partnerRequirement: 'I skal bo på samme adresse',
  };

  test('Makkerpris pr. person bruges, når brugeren træner med en makker', () => {
    // Uden makker: (3 * 149 + 9 * 299) / 12 = 261,5. Makkerpris: 199
    const best = priceSingleOffer(partnerOffer, {
      userOverrides: { discountProfile: ['partner'] },
    });
    expect(best.honestYearlyPrice).toBeCloseTo(199);
    expect(best.yearlyOption.kind).toBe('partner');
    expect(best.quarterlyPrice).toBeCloseTo(149);
    expect(best.partnerRequirement).toBe('I skal bo på samme adresse');
  });

  test('Makkerpris ignoreres for brugere uden makker', () => {
    const best = priceSingleOffer(partnerOffer);
    expect(best.honestYearlyPrice).toBeCloseTo(261.5);
  });
});

describe('Distance', () => {
  test('er luftlinje (haversine) fra brugerens placering', () => {
    const result = run({
      centers: [center({ location: { latitude: HOME.latitude + 1, longitude: HOME.longitude } })],
    });
    expect(result.centers[0].distanceKm).toBeCloseTo(111.19, 1);
  });

  test('er null, når brugerens placering ikke kendes', () => {
    const result = run({ location: null });
    expect(result.centers[0].distanceKm).toBeNull();
  });
});

describe('Filtre', () => {
  const ids = (result) => result.centers.map((entry) => entry.center.id);
  const byId = (result, id) => result.centers.find((entry) => entry.center.id === id);

  test('maks. afstand er altid hård', () => {
    const result = run({
      centers: [
        center({ id: 'naer', location: north(2) }),
        center({ id: 'fjern', location: north(10) }),
      ],
      filters: { maxDistanceKm: 5 },
    });
    expect(ids(result)).toEqual(['naer']);
  });

  test('kendt manglende facilitet skjuler Centret; ukendt giver "Ikke oplyst"', () => {
    const result = run({
      centers: [
        center({ id: 'ja', facilities: { sauna: true } }),
        center({ id: 'nej', facilities: { sauna: false } }),
        center({ id: 'ukendt', facilities: { sauna: null } }),
      ],
      filters: { sauna: true },
    });
    expect(ids(result).sort()).toEqual(['ja', 'ukendt']);
    expect(byId(result, 'ja')).toMatchObject({ notStated: [], isSureMatch: true });
    expect(byId(result, 'ukendt')).toMatchObject({ notStated: ['sauna'], isSureMatch: false });
  });

  test('holdtræning og døgnåbent filtreres på samme måde', () => {
    const result = run({
      centers: [
        center({ id: 'alt', facilities: { groupClasses: true, open24h: true } }),
        center({ id: 'ikke-doegn', facilities: { groupClasses: true, open24h: false } }),
        center({ id: 'ukendt-hold', facilities: { open24h: true } }),
      ],
      filters: { groupClasses: true, open24h: true },
    });
    expect(ids(result).sort()).toEqual(['alt', 'ukendt-hold']);
    expect(byId(result, 'ukendt-hold').notStated).toEqual(['groupClasses']);
  });

  test('maskiner: kendt manglende maskine skjuler, ukendt maskinliste giver "Ikke oplyst"', () => {
    const result = run({
      centers: [
        center({ id: 'har', machines: ['Bænkpres', 'Squat rack'] }),
        center({ id: 'mangler', machines: ['Bænkpres'] }),
        center({ id: 'ukendt', machines: null }),
      ],
      filters: { machines: ['Bænkpres', 'Squat rack'] },
    });
    expect(ids(result).sort()).toEqual(['har', 'ukendt']);
    expect(byId(result, 'ukendt').notStated).toEqual(['machines']);
  });

  test('ingen Binding: Tilbud med Binding tæller ikke med, ukendt Binding giver "Ikke oplyst"', () => {
    const result = run({
      centers: [
        center({
          id: 'blandet',
          offers: [
            offer({ id: 'billig-bundet', standardPrice: 149, bindingMonths: 12 }),
            offer({ id: 'fri', standardPrice: 249, bindingMonths: 0 }),
          ],
        }),
        center({ id: 'kun-bundet', offers: [offer({ bindingMonths: 6 })] }),
        center({ id: 'ukendt', offers: [offer({ bindingMonths: null })] }),
      ],
      filters: { noBinding: true },
    });
    expect(ids(result).sort()).toEqual(['blandet', 'ukendt']);
    expect(byId(result, 'blandet').bestOffer.offer.id).toBe('fri');
    expect(byId(result, 'blandet').honestYearlyPrice).toBeCloseTo(249);
    expect(byId(result, 'ukendt').notStated).toEqual(['binding']);
  });

  test('adgang til flere centre kræver Abonnementstypen Landsdækkende', () => {
    const result = run({
      centers: [
        center({
          id: 'begge',
          offers: [
            offer({ id: 'lokal', subscriptionType: 'Lokal center', standardPrice: 199 }),
            offer({ id: 'land', subscriptionType: 'Landsdækkende', standardPrice: 299 }),
          ],
        }),
        center({ id: 'kun-lokal', offers: [offer({ subscriptionType: 'Lokal center' })] }),
      ],
      filters: { multiCenterAccess: true },
    });
    expect(ids(result)).toEqual(['begge']);
    expect(result.centers[0].bestOffer.offer.id).toBe('land');
  });

  test('uden aktive Filtre er alle Centre sikre match', () => {
    const result = run({ centers: [center({ facilities: { sauna: null }, machines: null })] });
    expect(result.centers[0]).toMatchObject({ notStated: [], isSureMatch: true });
  });
});

describe('Anbefalet', () => {
  const centers = [
    center({ id: 'sikker-dyr', location: north(1), offers: [offer({ standardPrice: 299 })] }),
    center({ id: 'sikker-billig', location: north(3), offers: [offer({ standardPrice: 249 })] }),
    center({
      id: 'ukendt-billigst',
      location: north(2),
      facilities: { sauna: null },
      offers: [offer({ standardPrice: 149 })],
    }),
  ];

  test('er lavest Ærlig årspris blandt sikre match', () => {
    const result = run({ centers, filters: { sauna: true } });
    expect(result.recommendedId).toBe('sikker-billig');
    expect(result.recommendedOfferId).toBe('tilbud');
  });

  test('er uafhængig af sorteringen', () => {
    for (const sortBy of ['honestYearlyPrice', 'quarterlyPrice', 'priceDesc', 'distance']) {
      expect(run({ centers, filters: { sauna: true }, sortBy }).recommendedId).toBe(
        'sikker-billig',
      );
    }
  });

  test('vælger kun blandt Tilbud, der med sikkerhed matcher', () => {
    // Det billigste Tilbud i 'a' har ukendt Binding, så Anbefalet bygger på de sikre Tilbud.
    const result = run({
      centers: [
        center({
          id: 'a',
          offers: [
            offer({ id: 'ukendt-binding', standardPrice: 99, bindingMonths: null }),
            offer({ id: 'fri', standardPrice: 279, bindingMonths: 0 }),
          ],
        }),
        center({ id: 'b', offers: [offer({ id: 'b-fri', standardPrice: 259, bindingMonths: 0 })] }),
      ],
      filters: { noBinding: true },
    });
    expect(result.recommendedId).toBe('b');
    expect(result.recommendedOfferId).toBe('b-fri');
  });

  test('er null, når ingen Centre med sikkerhed matcher', () => {
    const result = run({
      centers: [center({ facilities: { sauna: null } })],
      filters: { sauna: true },
    });
    expect(result.centers).toHaveLength(1);
    expect(result.recommendedId).toBeNull();
  });
});

describe('Sortering', () => {
  // X: år (3 * 100 + 9 * 300) / 12 = 250, kvartal 100, 3 km
  // Y: år 200, kvartal 200, 1 km
  // Z: år 300, kvartal 300, 2 km
  const centers = [
    center({
      id: 'X',
      location: north(3),
      offers: [offer({ standardPrice: 300, campaignPrice: 100, campaignMonths: 3 })],
    }),
    center({ id: 'Y', location: north(1), offers: [offer({ standardPrice: 200 })] }),
    center({ id: 'Z', location: north(2), offers: [offer({ standardPrice: 300 })] }),
  ];
  const order = (sortBy) => run({ centers, sortBy }).centers.map((entry) => entry.center.id);

  test('Ærlig årspris lav→høj', () => expect(order('honestYearlyPrice')).toEqual(['Y', 'X', 'Z']));
  test('Kvartalspris lav→høj', () => expect(order('quarterlyPrice')).toEqual(['X', 'Y', 'Z']));
  test('Pris høj→lav', () => expect(order('priceDesc')).toEqual(['Z', 'X', 'Y']));
  test('Afstand', () => expect(order('distance')).toEqual(['Y', 'Z', 'X']));
});

describe('Spar mere-forslag', () => {
  const aeldreSagenChain = (price) =>
    chain({ discounts: [{ discountGroup: 'aeldreSagen', price }] });
  const suggestionsFor = (overrides) => run(overrides).centers[0].savingSuggestions;

  test('foreslår Ældre Sagen, når Besparelsen er større end medlemsprisen', () => {
    // (300 - 249) * 12 = 612 kr/år > 310 kr/år
    expect(suggestionsFor({ chains: [aeldreSagenChain(249)] })).toEqual([
      expect.objectContaining({
        discountGroup: 'aeldreSagen',
        label: 'Ældre Sagen-medlem',
        membershipPricePerYear: 310,
        honestYearlyPrice: 249,
        savingPerYear: 612,
      }),
    ]);
  });

  test('intet forslag, når Besparelsen ikke dækker medlemsprisen', () => {
    // (300 - 279) * 12 = 252 kr/år < 310 kr/år
    expect(suggestionsFor({ chains: [aeldreSagenChain(279)] })).toEqual([]);
  });

  test('intet forslag, når brugeren allerede er medlem', () => {
    const member = user({ discountProfile: ['aeldreSagen'] });
    expect(suggestionsFor({ chains: [aeldreSagenChain(149)], user: member })).toEqual([]);
  });

  test('intet forslag for Rabatgrupper man ikke kan melde sig ind i', () => {
    expect(
      suggestionsFor({ chains: [chain({ discounts: [{ discountGroup: 'student', price: 99 }] })] }),
    ).toEqual([]);
  });

  test('intet forslag til brugere under 18', () => {
    const young = user({ birthDate: '2010-01-01' });
    expect(suggestionsFor({ chains: [aeldreSagenChain(149)], user: young })).toEqual([]);
  });
});

describe('Nuværende medlemskab', () => {
  test('Besparelse pr. måned i forhold til Nuværende medlemskab', () => {
    const result = run({ user: user({ currentMembership: { monthlyPrice: 349 } }) });
    expect(result.centers[0].savingPerMonth).toBeCloseTo(49);
  });

  test('ingen Besparelse uden Nuværende medlemskab', () => {
    expect(run().centers[0].savingPerMonth).toBeNull();
  });
});

describe('Uafhængighed', () => {
  test('modulet importerer intet fra React Native eller Expo, så nat-jobbet kan bruge det', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, 'matchning.js'),
      'utf8',
    );
    expect(source).not.toMatch(/from ['"](react-native|expo)/);
    expect(source).not.toMatch(/require\(['"](react-native|expo)/);
  });
});

describe('Tom-tilstand', () => {
  test('ingen Centre giver tom liste og intet Anbefalet', () => {
    expect(run({ centers: [] })).toEqual({
      centers: [],
      recommendedId: null,
      recommendedOfferId: null,
    });
  });

  test('når Filtrene skjuler alt, er listen tom og intet Anbefalet', () => {
    const result = run({
      centers: [center({ facilities: { sauna: false } })],
      filters: { sauna: true },
    });
    expect(result).toEqual({ centers: [], recommendedId: null, recommendedOfferId: null });
  });

  test('et Center uden Tilbud vises ikke', () => {
    expect(run({ centers: [center({ offers: [] })] }).centers).toEqual([]);
  });
});
