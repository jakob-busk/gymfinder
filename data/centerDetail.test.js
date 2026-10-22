import {
  facilityRows,
  feeSummary,
  formatKr,
  matchCenter,
  offerSignupUrl,
  partnerInfo,
  priceBreakdown,
  receiptLines,
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
        offers: [
          offer({ id: 'bundet', bindingMonths: 12 }),
          offer({ id: 'fri', standardPrice: 350 }),
        ],
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
  test('med Makkerpris, kampagne og eget Oprettelsesgebyr giver præcis Matchnings pris', () => {
    // 30+: (80 + 2 * (50 + 15) + 10 * (300 + 15)) / 12 = (80 + 130 + 3150) / 12 = 280
    const best = bestOfferFor(
      {
        standardPrice: { under30: 360, over30: 400 },
        campaignPrice: { under30: 189, over30: 209 },
        campaignMonths: 1,
        signupFee: 60,
        adminFee: 15,
        partnerPrice: { under30: 280, over30: 300 },
        partnerCampaignPrice: 50,
        partnerCampaignMonths: 2,
        partnerSignupFee: 80,
      },
      { discountProfile: ['partner'] },
    );
    const breakdown = priceBreakdown(best);
    expect(best.yearlyOption.kind).toBe('partner');
    expect(breakdown.honestYearlyPrice).toBeCloseTo(best.honestYearlyPrice, 10);
    expect(breakdown.honestYearlyPrice).toBeCloseTo(280, 10);
    expect(breakdown.signupFee).toBe(80);
    expect(breakdown.rows[0]).toMatchObject({ kindLabel: 'Makkerpris (kampagne)', total: 65 });
    expect(breakdown.rows[2]).toMatchObject({ kindLabel: 'Makkerpris', total: 315 });
  });

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
      offerName: 'Basis',
      birthdayMonth: 'januar 2027',
      fromPeriod: 3,
      priceBefore: 200,
      priceAfter: 250,
    });
  });

  test('advarer ikke, når den billigste mulighed har fast pris, fx Makkerpris', () => {
    const best = bestOfferFor(
      { standardPrice: { under30: 200, over30: 250 }, partnerPrice: 150 },
      { birthDate: '1997-01-15', discountProfile: ['partner'] },
    );
    expect(best.yearlyOption.kind).toBe('partner');
    expect(turns30Notice('1997-01-15', best)).toBeNull();
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
      campaign: null,
      signupFee: 0,
      requirement: 'I skal bo på samme adresse.',
      isCheapest: true,
    });
  });

  test('viser Makkerpris for brugerens Aldersgruppe, kampagnen og eget Oprettelsesgebyr', () => {
    const best = bestOfferFor(
      {
        signupFee: 60,
        partnerPrice: { under30: 280, over30: 300 },
        partnerCampaignPrice: { under30: 40, over30: 50 },
        partnerCampaignMonths: 2,
        partnerSignupFee: 80,
      },
      { discountProfile: ['partner'] },
    );
    expect(partnerInfo(user({ discountProfile: ['partner'] }), best)).toMatchObject({
      available: true,
      price: 300,
      campaign: { price: 50, months: 2 },
      signupFee: 80,
    });
  });

  test('fortæller, når Tilbuddet ikke har en Makkerpris', () => {
    const partnerUser = user({ discountProfile: ['partner'] });
    expect(partnerInfo(partnerUser, bestOfferFor({}, { discountProfile: ['partner'] }))).toEqual({
      available: false,
      price: null,
      campaign: null,
      signupFee: null,
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

  test('åbner Tilbuddets eget link med samme henvisning', () => {
    const best = bestOfferFor({ signupUrl: 'https://kaede.dk/tilmeld?produkt=basis' });
    expect(signupLink(center(), CHAIN, best)).toBe(
      'https://kaede.dk/tilmeld?produkt=basis&utm_source=gymfinder&utm_medium=henvisning' +
        '&utm_content=kaede-centrum',
    );
  });

  test('vælger linket for brugerens Aldersgruppe i dag', () => {
    const links = {
      standardPrice: { under30: 250, over30: 300 },
      signupUrl: { under30: 'https://kaede.dk/u30', over30: 'https://kaede.dk/o30' },
    };
    expect(offerSignupUrl(bestOfferFor(links))).toBe('https://kaede.dk/o30');
    expect(offerSignupUrl(bestOfferFor(links, { birthDate: '2000-01-01' }))).toBe(
      'https://kaede.dk/u30',
    );
  });

  test('er Makkerpris billigst, åbnes Makkerprisens link', () => {
    const partner = {
      signupUrl: 'https://kaede.dk/basis',
      partnerPrice: 200,
      partnerSignupUrl: {
        under30: 'https://kaede.dk/makker-u30',
        over30: 'https://kaede.dk/makker',
      },
    };
    expect(offerSignupUrl(bestOfferFor(partner, { discountProfile: ['partner'] }))).toBe(
      'https://kaede.dk/makker',
    );
    expect(offerSignupUrl(bestOfferFor(partner))).toBe('https://kaede.dk/basis');
    // Uden eget link til Makkerprisen bruges Tilbuddets.
    expect(
      offerSignupUrl(
        bestOfferFor({ ...partner, partnerSignupUrl: undefined }, { discountProfile: ['partner'] }),
      ),
    ).toBe('https://kaede.dk/basis');
  });

  test('uden link på Tilbuddet bruges Centrets', () => {
    expect(offerSignupUrl(bestOfferFor())).toBeNull();
    expect(signupLink(center(), CHAIN, bestOfferFor())).toMatch(/^https:\/\/kaede\.dk\/tilmeld\?/);
  });
});

describe('formatKr', () => {
  test('bruger dansk tegnsætning og dropper ,00', () => {
    expect(formatKr(1234)).toBe('1.234 kr');
    expect(formatKr(224.5)).toBe('224,50 kr');
    expect(formatKr(0)).toBe('0 kr');
  });
});

describe('receiptLines', () => {
  test('samler måneder i træk med samme pris og slags pris på én linje', () => {
    const best = bestOfferFor({
      standardPrice: 299,
      campaignPrice: 99,
      campaignMonths: 2,
      signupFee: 60,
      adminFee: 15,
    });
    const lines = receiptLines(priceBreakdown(best).rows);

    expect(lines).toEqual([
      { key: '1', label: 'Måned 1–2', kindLabel: 'Kampagnepris', total: 114, share: 1, count: 2 },
      { key: '3', label: 'Måned 3–12', kindLabel: 'Standardpris', total: 314, share: 1, count: 10 },
    ]);
  });

  test('den delvise 13. betaling ved 30 dage står alene', () => {
    const best = bestOfferFor({ standardPrice: 240, billingIntervalDays: 30 });
    const lines = receiptLines(priceBreakdown(best).rows);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ label: 'Betaling 1–12', count: 12, total: 240 });
    expect(lines[1]).toMatchObject({ label: 'Betaling 13', count: 1 });
    expect(lines[1].share).toBeCloseTo(1 / 6, 4);
  });
});
