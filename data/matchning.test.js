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
  return { birthDate: '2000-01-01', discountGroups: [], currentMembership: null, ...overrides };
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
    const best = priceSingleOffer({ standardPrice: 299, campaignPrice: 99, campaignMonths: 3, adminFee: 10, signupFee: 199 });
    expect(best.monthlyBreakdown).toHaveLength(12);
    expect(best.monthlyBreakdown[0]).toMatchObject({ month: 1, price: 99, adminFee: 10, total: 109, kind: 'campaign' });
    expect(best.monthlyBreakdown[3]).toMatchObject({ month: 4, price: 299, adminFee: 10, total: 309, kind: 'standard' });
    expect(best.signupFee).toBe(199);
  });
});

describe('Kampagne og Rabatter lægges aldrig sammen', () => {
  test('den billigste mulighed vælges uafhængigt for 12 og 3 måneder', () => {
    // Uden rabat: år (3 * 100 + 9 * 300) / 12 = 250, kvartal 100
    // Studierabat 25 %: 225 hele året. Lagt sammen ville året give 187,5 - det må ikke ske.
    const best = priceSingleOffer(
      { standardPrice: 300, campaignPrice: 100, campaignMonths: 3 },
      {
        chainOverrides: { discounts: [{ group: 'student', percentOff: 25 }] },
        userOverrides: { discountGroups: ['student'] },
      },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(225);
    expect(best.yearlyOption).toMatchObject({ kind: 'discount', group: 'student' });
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
            { group: 'student', price: 249 },
            { group: 'aeldreSagen', percentOff: 10 },
          ],
        },
        userOverrides: { discountGroups: ['student', 'aeldreSagen'] },
      },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(249);
    expect(best.yearlyOption.group).toBe('student');
  });

  test('Rabatter for Rabatgrupper brugeren ikke tilhører, tælles ikke med', () => {
    const best = priceSingleOffer(
      { standardPrice: 299 },
      { chainOverrides: { discounts: [{ group: 'senior', price: 149 }] } },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(299);
    expect(best.yearlyOption.kind).toBe('standard');
  });

  test('Rabat med Rabatperiode gælder kun de første måneder', () => {
    // (6 * 149 + 6 * 299) / 12 = 224
    const best = priceSingleOffer(
      { standardPrice: 299 },
      {
        chainOverrides: { discounts: [{ group: 'student', price: 149, months: 6 }] },
        userOverrides: { discountGroups: ['student'] },
      },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(224);
  });

  test('Rabat begrænset til en Abonnementstype gælder ikke for andre', () => {
    const best = priceSingleOffer(
      { standardPrice: 399, subscriptionType: 'Landsdækkende' },
      {
        chainOverrides: { discounts: [{ group: 'student', price: 199, subscriptionTypes: ['Lokal center'] }] },
        userOverrides: { discountGroups: ['student'] },
      },
    );
    expect(best.honestYearlyPrice).toBeCloseTo(399);
  });

  test('Rabat kan give gratis Oprettelsesgebyr', () => {
    // Uden rabat: (299 + 12 * 249) / 12 = 273,92. Studerende: (0 + 12 * 249) / 12 = 249
    const best = priceSingleOffer(
      { standardPrice: 249, signupFee: 299 },
      {
        chainOverrides: { discounts: [{ group: 'student', percentOff: 0, signupFee: 0 }] },
        userOverrides: { discountGroups: ['student'] },
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
      chainOverrides: { discounts: [{ group: 'student', percentOff: 20 }] },
      userOverrides: { birthDate: '1997-01-15', discountGroups: ['student'] },
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
    const best = priceSingleOffer(partnerOffer, { userOverrides: { discountGroups: ['partner'] } });
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
