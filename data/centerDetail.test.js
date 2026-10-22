import {
  facilityRows,
  feeSummary,
  formatKr,
  matchCenter,
  partnerInfo,
  priceBreakdown,
  signupLink,
  turns30Notice,
} from './centerDetail';

// Adfærdstests for Centerdetaljens visningslogik. Alle tal er regnet ud på forhånd.

const TODAY = '2026-10-22';
const HOME = { latitude: 55.6761, longitude: 12.5683 };

const CHAIN = {
  id: 'kaede',
  name: 'Kæde',
  website: 'https://kaede.dk',
  discounts: [{ discountGroup: 'student', percentOff: 50 }],
};

function offer(overrides = {}) {
  return {
    id: 'basis',
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
    id: 'kaede-centrum',
    chainId: 'kaede',
    name: 'Kæde Centrum',
    address: 'Gaden 1, 1000 København',
    location: HOME,
    facilities: { sauna: true, groupClasses: false, open24h: null },
    machines: ['Bænkpres', 'Løbebånd'],
    signupUrl: 'https://kaede.dk/tilmeld',
    offers: [offer()],
    ...overrides,
  };
}

function user(overrides = {}) {
  return {
    birthDate: '1990-01-01',
    discountProfile: [],
    currentMembership: null,
    location: HOME,
    ...overrides,
  };
}

function bestOfferFor(offerOverrides, userOverrides) {
  const match = matchCenter({
    center: center({ offers: [offer(offerOverrides)] }),
    chains: [CHAIN],
    user: user(userOverrides),
    today: TODAY,
  });
  return match.bestOffer;
}

describe('matchCenter', () => {
  test('viser alle Tilbud, også dem brugerens Filtre ville skjule på Find', () => {
    const match = matchCenter({
      center: center({
        offers: [offer({ id: 'bundet', bindingMonths: 12 }), offer({ id: 'fri', standardPrice: 350 })],
      }),
      chains: [CHAIN],
      user: user({ preferences: { noBinding: true } }),
      today: TODAY,
    });
    expect(match.offers.map((priced) => priced.offer.id)).toEqual(['bundet', 'fri']);
    expect(match.distanceKm).toBeCloseTo(0, 6);
  });

  test('giver null, når Centret ikke findes', () => {
    expect(matchCenter({ center: undefined, chains: [CHAIN], user: user(), today: TODAY })).toBe(
      null,
    );
  });

  test('vælger Rabatten som billigst for dig, når den slår kampagnen over året', () => {
    const best = bestOfferFor(
      { campaignPrice: 99, campaignMonths: 1 },
      { discountProfile: ['student'] },
    );
    // Kampagne: (99 + 11 * 300) / 12 = 283,25. Studierabat: 150 hele året.
    expect(best.yearlyOption.label).toBe('Studierabat');
    expect(best.honestYearlyPrice).toBe(150);
  });
});

describe('priceBreakdown', () => {
  test('månedsudregningen giver præcis Matchnings Ærlig årspris', () => {
    const best = bestOfferFor({
      standardPrice: 299,
      campaignPrice: 99,
      campaignMonths: 2,
      signupFee: 60,
      adminFee: 15,
    });
    const breakdown = priceBreakdown(best);

    expect(breakdown.rows).toHaveLength(12);
    expect(breakdown.rows[0]).toMatchObject({
      label: 'Måned 1',
      kindLabel: 'Kampagnepris',
      price: 99,
      adminFee: 15,
      total: 114,
      share: 1,
    });
    expect(breakdown.rows[2]).toMatchObject({
      label: 'Måned 3',
      kindLabel: 'Standardpris',
      total: 314,
    });
    // 60 + 2 * 114 + 10 * 314 = 3.428 kr. 3.428 / 12 = 285,67 kr/md.
    expect(breakdown.perPeriod).toBe('md');
    expect(breakdown.signupFee).toBe(60);
    expect(breakdown.paymentsTotal).toBe(3368);
    expect(breakdown.yearTotal).toBe(3428);
    expect(breakdown.honestYearlyPrice).toBeCloseTo(285.6667, 4);
    expect(breakdown.honestYearlyPrice).toBeCloseTo(best.honestYearlyPrice, 10);
  });

  test('tæller kun den del af den 13. betaling med, der falder inden for året ved 30 dage', () => {
    const best = bestOfferFor({ standardPrice: 240, billingIntervalDays: 30 });
    const breakdown = priceBreakdown(best);

    // 365 / 30 = 12 1/6 betalinger: 12 * 240 + 240 / 6 = 2.920 kr. 2.920 / 12 = 243,33 kr/md.
    expect(breakdown.perPeriod).toBe('30 dage');
    expect(breakdown.rows).toHaveLength(13);
    expect(breakdown.rows[12].label).toBe('Betaling 13');
    expect(breakdown.rows[12].share).toBeCloseTo(1 / 6, 10);
    expect(breakdown.rows[12].counted).toBeCloseTo(40, 10);
    expect(breakdown.yearTotal).toBeCloseTo(2920, 10);
    expect(breakdown.honestYearlyPrice).toBeCloseTo(best.honestYearlyPrice, 10);
  });

  test('viser Aldersgruppen på Standardprisen, når brugeren fylder 30 i løbet af året', () => {
    const best = bestOfferFor(
      { standardPrice: { under30: 200, over30: 250 } },
      { birthDate: '1997-01-15' },
    );
    const breakdown = priceBreakdown(best);
    // Måned 3 (22. dec.–22. jan.) rummer 30-års-fødselsdagen den 15. januar 2027.
    expect(breakdown.rows[1]).toMatchObject({ kindLabel: 'Standardpris (under 30)', total: 200 });
    expect(breakdown.rows[2]).toMatchObject({ kindLabel: 'Standardpris (30+)', total: 250 });
    // 2 * 200 + 10 * 250 = 2.900 kr. 2.900 / 12 = 241,67 kr/md.
    expect(breakdown.honestYearlyPrice).toBeCloseTo(241.6667, 4);
  });
});

describe('turns30Notice', () => {
  test('nævner måneden for 30-års-fødselsdagen og hvorfra prisen stiger', () => {
    const best = bestOfferFor(
      { standardPrice: { under30: 200, over30: 250 } },
      { birthDate: '1997-01-15' },
    );
    // Måned 3 løber 22. dec.–22. jan., og brugeren fylder 30 den 15. januar 2027.
    expect(turns30Notice('1997-01-15', best)).toEqual({
      birthdayMonth: 'januar 2027',
      fromPeriod: 3,
    });
  });

  test('advarer ikke, når prisen ikke afhænger af alderen, eller brugeren ikke fylder 30', () => {
    const samePrice = bestOfferFor({ standardPrice: 300 }, { birthDate: '1997-01-15' });
    expect(turns30Notice('1997-01-15', samePrice)).toBeNull();

    const older = bestOfferFor({ standardPrice: { under30: 200, over30: 250 } });
    expect(turns30Notice('1990-01-01', older)).toBeNull();
    expect(turns30Notice(null, older)).toBeNull();
  });
});

describe('feeSummary', () => {
  test('viser Oprettelsesgebyr, Admingebyr og Binding', () => {
    expect(feeSummary(bestOfferFor({ signupFee: 299, adminFee: 15, bindingMonths: 6 }))).toEqual({
      signupFee: '299 kr',
      adminFee: '15 kr pr. md',
      binding: '6 mdr.',
    });
  });

  test('viser gratis, ingen og ikke oplyst', () => {
    expect(feeSummary(bestOfferFor({ bindingMonths: null }))).toEqual({
      signupFee: 'Gratis',
      adminFee: 'Ingen',
      binding: 'Ikke oplyst',
    });
    expect(feeSummary(bestOfferFor({ bindingMonths: 0 })).binding).toBe('Ingen');
  });
});

describe('partnerInfo', () => {
  const partnerOffer = {
    partnerPrice: 224.5,
    partnerRequirement: 'I skal bo på samme adresse.',
  };

  test('viser Makkerpris og kædens krav for brugere, der træner med en makker', () => {
    const best = bestOfferFor(partnerOffer, { discountProfile: ['partner'] });
    expect(partnerInfo(user({ discountProfile: ['partner'] }), best)).toEqual({
      available: true,
      price: 224.5,
      requirement: 'I skal bo på samme adresse.',
      isCheapest: true,
    });
  });

  test('fortæller, når Tilbuddet ikke har en Makkerpris', () => {
    const partnerUser = user({ discountProfile: ['partner'] });
    expect(partnerInfo(partnerUser, bestOfferFor({}, { discountProfile: ['partner'] }))).toEqual({
      available: false,
      price: null,
      requirement: null,
      isCheapest: false,
    });
  });

  test('viser intet for brugere, der ikke træner med en makker', () => {
    expect(partnerInfo(user(), bestOfferFor(partnerOffer))).toBeNull();
  });
});

describe('facilityRows', () => {
  test('viser faciliteter og maskiner som Ja, Nej og Ikke oplyst', () => {
    expect(facilityRows(center())).toEqual([
      { key: 'sauna', label: 'Sauna', value: 'Ja' },
      { key: 'groupClasses', label: 'Holdtræning', value: 'Nej' },
      { key: 'open24h', label: 'Døgnåbent', value: 'Ikke oplyst' },
      { key: 'machines', label: 'Maskiner', value: 'Bænkpres, Løbebånd' },
    ]);
    expect(facilityRows(center({ machines: null }))[3].value).toBe('Ikke oplyst');
  });
});

describe('signupLink', () => {
  test('åbner Centrets tilmeldingsside med henvisning fra GymFinder', () => {
    expect(signupLink(center(), CHAIN)).toBe(
      'https://kaede.dk/tilmeld?utm_source=gymfinder&utm_medium=henvisning' +
        '&utm_content=kaede-centrum',
    );
  });

  test('beholder eksisterende parametre og anker', () => {
    expect(signupLink(center({ signupUrl: 'https://kaede.dk/t?c=1#start' }), CHAIN)).toBe(
      'https://kaede.dk/t?c=1&utm_source=gymfinder&utm_medium=henvisning' +
        '&utm_content=kaede-centrum#start',
    );
  });

  test('falder tilbage til Kædens hjemmeside og giver null uden link', () => {
    expect(signupLink(center({ signupUrl: undefined }), CHAIN)).toMatch(/^https:\/\/kaede\.dk\?/);
    expect(signupLink(center({ signupUrl: undefined }), null)).toBeNull();
  });
});

describe('formatKr', () => {
  test('bruger dansk tegnsætning og dropper ,00', () => {
    expect(formatKr(1234)).toBe('1.234 kr');
    expect(formatKr(224.5)).toBe('224,50 kr');
    expect(formatKr(0)).toBe('0 kr');
  });
});
