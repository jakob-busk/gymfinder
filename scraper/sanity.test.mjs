// Sanity-reglerne pr. Center og Tilbud samt reglen på kædeniveau.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { centerProblems, chainSkipReason, isInDenmark, offerProblems } from './sanity.mjs';

const validCenter = {
  id: 'sats-412',
  chainId: 'sats',
  name: 'SATS Adelgade',
  address: 'Adelgade 5-7, 1304 København K',
  location: { latitude: 55.683026, longitude: 12.582453 },
  signupUrl: 'https://www.sats.dk/traeningscenter/kobenhavn/kbh-adelgade',
};

const validOffer = {
  id: 'sats-412-1club-allday-nobnd-gx',
  name: 'Basic',
  subscriptionType: 'Lokal center',
  standardPrice: { under30: 549, over30: 649 },
  campaignPrice: 0,
  campaignMonths: 1,
  signupFee: 0,
};

const withPrice = (standardPrice, extra = {}) => ({ ...validOffer, standardPrice, ...extra });

describe('Center', () => {
  test('et gyldigt Center har ingen problemer', () => {
    assert.deepEqual(centerProblems(validCenter), []);
  });

  test('påkrævede felter skal være udfyldt', () => {
    const problems = centerProblems({ ...validCenter, name: ' ', address: undefined });
    assert.deepEqual(problems, ['Centret mangler name', 'Centret mangler address']);
  });

  test('manglende koordinater afvises', () => {
    assert.deepEqual(centerProblems({ ...validCenter, location: undefined }), [
      'Centret mangler koordinater',
    ]);
    assert.deepEqual(centerProblems({ ...validCenter, location: { latitude: '55.6' } }), [
      'Centret mangler koordinater',
    ]);
  });

  test('koordinater uden for Danmark afvises', () => {
    assert.deepEqual(
      centerProblems({ ...validCenter, location: { latitude: 59.91, longitude: 10.75 } }),
      ['Koordinaterne 59.91, 10.75 ligger ikke i Danmark'],
    );
  });
});

describe('koordinater i Danmark', () => {
  const places = {
    København: [55.6761, 12.5683],
    Dragør: [55.593, 12.672],
    Helsingør: [56.0361, 12.6136],
    Skagen: [57.7209, 10.5839],
    Esbjerg: [55.4765, 8.4594],
    Padborg: [54.8263, 9.3636],
    Gedser: [54.5745, 11.9258],
    'Rønne (Bornholm)': [55.1009, 14.7066],
    'Nexø (Bornholm)': [55.0603, 15.1311],
    'Nykøbing Mors': [56.7953, 8.8581],
  };
  for (const [name, [latitude, longitude]] of Object.entries(places)) {
    test(`${name} ligger i Danmark`, () => {
      assert.equal(isInDenmark({ latitude, longitude }), true);
    });
  }

  const abroad = {
    Malmø: [55.605, 13.0038],
    Landskrona: [55.8708, 12.8302],
    Helsingborg: [56.0465, 12.6945],
    Ystad: [55.4295, 13.82],
    Flensborg: [54.7937, 9.4469],
    Rügen: [54.5, 13.4],
    Oslo: [59.9139, 10.7522],
    Stockholm: [59.3293, 18.0686],
    'byttede koordinater': [12.582453, 55.683026],
    'nul-ø': [0, 0],
  };
  for (const [name, [latitude, longitude]] of Object.entries(abroad)) {
    test(`${name} afvises`, () => {
      assert.equal(isInDenmark({ latitude, longitude }), false);
    });
  }
});

describe('Tilbud', () => {
  test('et gyldigt Tilbud har ingen problemer', () => {
    assert.deepEqual(offerProblems(validOffer), []);
  });

  test('prisen skal ligge mellem 50 og 2.000 kr/md (grænserne er tilladt)', () => {
    assert.deepEqual(offerProblems(withPrice({ under30: 50, over30: 2000 })), []);
    assert.deepEqual(offerProblems(withPrice(549)), []);
    assert.deepEqual(offerProblems(withPrice({ under30: 49, over30: 2001 })), [
      'Standardpris (under30) 49 kr/md ligger uden for 50–2000 kr/md',
      'Standardpris (over30) 2001 kr/md ligger uden for 50–2000 kr/md',
    ]);
  });

  test('en pris, der ikke er et tal, afvises', () => {
    assert.deepEqual(offerProblems(withPrice({ under30: null, over30: 649 })), [
      'Standardpris (under30) er ikke et tal',
    ]);
  });

  test('påkrævede felter skal være udfyldt, også begge Aldersgrupper', () => {
    const offer = {
      ...validOffer,
      name: '',
      subscriptionType: undefined,
      signupFee: undefined,
      standardPrice: { under30: 549 },
    };
    assert.deepEqual(offerProblems(offer), [
      'Tilbuddet mangler name',
      'Tilbuddet mangler subscriptionType',
      'Tilbuddet mangler Oprettelsesgebyr',
      'Standardpris mangler for over30',
    ]);
    assert.deepEqual(offerProblems({ ...validOffer, standardPrice: undefined }), [
      'Tilbuddet mangler Standardpris',
    ]);
  });

  test('Kampagnepris skal være lavere end den laveste Standardpris', () => {
    assert.deepEqual(offerProblems({ ...validOffer, campaignPrice: 548 }), []);
    assert.deepEqual(offerProblems({ ...validOffer, campaignPrice: 549 }), [
      'Kampagnepris 549 er ikke lavere end Standardpris 549',
    ]);
    assert.deepEqual(offerProblems({ ...validOffer, campaignPrice: -1 }), [
      'Kampagnepris -1 kr/md ligger uden for 0–2000 kr/md',
    ]);
    assert.deepEqual(offerProblems({ ...validOffer, campaignPrice: 'gratis' }), [
      'Kampagnepris er ikke et gyldigt tal',
    ]);
    assert.deepEqual(offerProblems({ ...validOffer, campaignPrice: null }), []);
  });

  test('Kampagnepris skal ligge mellem 0 og 2.000 kr/md', () => {
    const expensive = withPrice(2500, { campaignPrice: 2001 });
    assert.deepEqual(offerProblems(expensive), [
      'Standardpris (single) 2500 kr/md ligger uden for 50–2000 kr/md',
      'Kampagnepris 2001 kr/md ligger uden for 0–2000 kr/md',
    ]);
    // 0 kr er en gyldig kampagne, og 2.000 kr er lige på grænsen.
    assert.deepEqual(offerProblems({ ...validOffer, campaignPrice: 0 }), []);
    assert.deepEqual(offerProblems(withPrice(2000, { campaignPrice: 1999 })), []);
  });

  test('Kampagnepris pr. Aldersgruppe tjekkes mod hver sin Standardpris', () => {
    const ok = withPrice({ under30: 429, over30: 479 }, {
      campaignPrice: { under30: 321.75, over30: 359.25 },
    });
    assert.deepEqual(offerProblems(ok), []);
    // 30+-kampagnen (450) er lavere end 30+-prisen, selvom den er over under 30-prisen (429).
    const overLowest = withPrice({ under30: 429, over30: 479 }, {
      campaignPrice: { under30: 321.75, over30: 450 },
    });
    assert.deepEqual(offerProblems(overLowest), []);
    const notLower = withPrice({ under30: 429, over30: 479 }, {
      campaignPrice: { under30: 429, over30: 2100 },
    });
    assert.deepEqual(offerProblems(notLower), [
      'Kampagnepris (over30) 2100 kr/md ligger uden for 0–2000 kr/md',
    ]);
    const equal = withPrice({ under30: 429, over30: 479 }, {
      campaignPrice: { under30: 429, over30: 300 },
    });
    assert.deepEqual(offerProblems(equal), [
      'Kampagnepris (under30) 429 er ikke lavere end Standardpris 429',
    ]);
    assert.deepEqual(offerProblems({ ...validOffer, campaignPrice: { under30: 100 } }), [
      'Kampagnepris mangler for over30',
    ]);
  });

  test('Kampagnepris må højst ændre sig ±50 % på én nat, hvis den fandtes i går', () => {
    const offer = (campaignPrice) => withPrice(549, { campaignPrice });
    assert.deepEqual(offerProblems(offer(150), offer(100)), []);
    assert.deepEqual(offerProblems(offer(151), offer(100)), [
      'Kampagnepris ændret 51 % på én nat (100 → 151 kr/md)',
    ]);
    assert.deepEqual(offerProblems(offer(49), offer(100)), [
      'Kampagnepris ændret -51 % på én nat (100 → 49 kr/md)',
    ]);
    // Ingen falske alarmer: en ny kampagne, en kampagne der slutter, og en gratis kampagne i går.
    assert.deepEqual(offerProblems(offer(99), offer(null)), []);
    assert.deepEqual(offerProblems(offer(null), offer(100)), []);
    assert.deepEqual(offerProblems(offer(99), offer(0)), []);
    // Fra ét tal til pr. Aldersgruppe sammenlignes hver Aldersgruppe med tallet.
    assert.deepEqual(offerProblems(offer({ under30: 120, over30: 140 }), offer(100)), []);
    assert.deepEqual(offerProblems(offer({ under30: 120, over30: 160 }), offer(100)), [
      'Kampagnepris (over30) ændret 60 % på én nat (100 → 160 kr/md)',
    ]);
  });

  test('Makkerpris skal ligge mellem 50 og 2.000 kr/md', () => {
    assert.deepEqual(offerProblems({ ...validOffer, partnerPrice: 50 }), []);
    assert.deepEqual(offerProblems({ ...validOffer, partnerPrice: 2000 }), []);
    assert.deepEqual(offerProblems({ ...validOffer, partnerPrice: 49 }), [
      'Makkerpris 49 kr/md ligger uden for 50–2000 kr/md',
    ]);
    const tooHigh = { ...validOffer, partnerPrice: { under30: 280, over30: 2001 } };
    assert.deepEqual(offerProblems(tooHigh), [
      'Makkerpris (over30) 2001 kr/md ligger uden for 50–2000 kr/md',
    ]);
    assert.deepEqual(offerProblems({ ...validOffer, partnerPrice: { over30: 300 } }), [
      'Makkerpris mangler for under30',
    ]);
    assert.deepEqual(offerProblems({ ...validOffer, partnerPrice: null }), []);
  });

  test('Makkerpris må højst ændre sig ±50 % på én nat', () => {
    const offer = (partnerPrice) => ({ ...validOffer, partnerPrice });
    assert.deepEqual(offerProblems(offer(300), offer(200)), []);
    assert.deepEqual(offerProblems(offer(100), offer(200)), []);
    assert.deepEqual(offerProblems(offer(301), offer(200)), [
      'Makkerpris ændret 51 % på én nat (200 → 301 kr/md)',
    ]);
    // Ingen falske alarmer for en ny Makkerpris eller en, der forsvinder.
    assert.deepEqual(offerProblems(offer(300), offer(null)), []);
    assert.deepEqual(offerProblems(offer(null), offer(300)), []);
    assert.deepEqual(
      offerProblems(offer({ under30: 280, over30: 300 }), offer({ under30: 280, over30: 300 })),
      [],
    );
  });

  test('Makkerprisens kampagne skal ligge mellem 0 og 2.000 kr/md og være lavere', () => {
    const offer = (partnerCampaignPrice) => ({
      ...validOffer,
      partnerPrice: 300,
      partnerCampaignPrice,
      partnerCampaignMonths: 2,
    });
    assert.deepEqual(offerProblems(offer(0)), []);
    assert.deepEqual(offerProblems(offer(-5)), [
      'Makkerprisens kampagne -5 kr/md ligger uden for 0–2000 kr/md',
    ]);
    assert.deepEqual(offerProblems(offer(300)), [
      'Makkerprisens kampagne 300 er ikke lavere end Makkerpris 300',
    ]);
  });

  test('et gyldigt Tilbud med alle prisfelter giver ingen falske alarmer', () => {
    const offer = withPrice({ under30: 360, over30: 400 }, {
      campaignPrice: { under30: 189, over30: 209 },
      partnerPrice: { under30: 280, over30: 300 },
      partnerCampaignPrice: 50,
      partnerCampaignMonths: 2,
      partnerSignupFee: 80,
    });
    assert.deepEqual(offerProblems(offer), []);
    assert.deepEqual(offerProblems(offer, offer), []);
  });

  test('prisen må højst ændre sig ±50 % på én nat', () => {
    const previous = withPrice({ under30: 400, over30: 600 });
    assert.deepEqual(offerProblems(withPrice({ under30: 600, over30: 300 }), previous), []);
    assert.deepEqual(offerProblems(withPrice({ under30: 601, over30: 299 }), previous), [
      'Standardpris (under30) ændret 50 % på én nat (400 → 601 kr/md)',
      'Standardpris (over30) ændret -50 % på én nat (600 → 299 kr/md)',
    ]);
  });

  test('±50 %-reglen virker også fra en gammel pris uden Aldersgrupper', () => {
    // Håndindtastede data har ét tal som Standardpris.
    const previous = withPrice(399);
    assert.deepEqual(offerProblems(withPrice({ under30: 549, over30: 649 }), previous), [
      'Standardpris (over30) ændret 63 % på én nat (399 → 649 kr/md)',
    ]);
    assert.deepEqual(offerProblems(withPrice(599), withPrice({ under30: 399, over30: 499 })), []);
  });

  test('et nyt Tilbud uden forrige nat tjekkes ikke for ændring', () => {
    assert.deepEqual(offerProblems(validOffer, undefined), []);
  });
});

describe('kædeniveau', () => {
  test('0 Centre springer Kæden over', () => {
    assert.equal(
      chainSkipReason({ centersFound: 0, failures: 0, validOffers: 0 }),
      'Kæden gav 0 Centre',
    );
  });

  test('præcis 20 % fejl er tilladt', () => {
    assert.equal(chainSkipReason({ centersFound: 10, failures: 2, validOffers: 8 }), null);
  });

  test('over 20 % fejl springer Kæden over', () => {
    assert.equal(
      chainSkipReason({ centersFound: 10, failures: 3, validOffers: 9 }),
      '3 af 12 fejlede (25 % > 20 %)',
    );
  });

  test('Centre men ingen gyldige Tilbud springer Kæden over', () => {
    assert.equal(
      chainSkipReason({ centersFound: 3, failures: 0, validOffers: 0 }),
      '0 af 0 fejlede (100 % > 20 %)',
    );
  });
});
