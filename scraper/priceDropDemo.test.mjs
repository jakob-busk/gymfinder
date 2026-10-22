// Demo-scriptets logik med falsk database og falsk push-afsender: ingen rigtige push.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { lowerOfferPrices, runPriceDropDemo } from './priceDropDemo.mjs';
import { createFakeDatabase } from './testing/fakeDatabase.mjs';
import { createFakePushClient } from './testing/fakePush.mjs';

const TODAY = '2026-10-22';
const TOKEN = 'ExponentPushToken[iphone]';
const AARHUS = { latitude: 56.1567, longitude: 10.2108 };

const database = (favoritePrice = 300) =>
  createFakeDatabase({
    Chains: {
      test: { id: 'test', name: 'Testkæde', website: 'https://example.dk' },
      anden: { id: 'anden', name: 'Anden kæde', website: 'https://example.dk' },
    },
    Centers: {
      'test-1': { id: 'test-1', chainId: 'test', name: 'Test Center', location: AARHUS },
      'anden-1': { id: 'anden-1', chainId: 'anden', name: 'Andet Center', location: AARHUS },
    },
    Offers: {
      'test-1': {
        a: { id: 'a', name: 'Basis', standardPrice: 300, signupFee: 0, lastSeen: TODAY },
        b: { id: 'b', name: 'Plus', standardPrice: { under30: 350, over30: 400 }, signupFee: 0 },
      },
      'anden-1': { c: { id: 'c', name: 'Basis', standardPrice: 200, signupFee: 0 } },
    },
    PriceHistory: { 'test-1': { a: { [TODAY]: { standardPrice: 300 } } } },
    Users: {
      anna: {
        profile: { location: AARHUS, birthDate: '1990-05-01' },
        favorites: {
          'test-1': { honestYearlyPrice: favoritePrice, priceAlert: { thresholdPerMonth: 0 } },
          // Andet Center er billigere end den gemte pris, men dets Kæde er ikke en del af demoen.
          'anden-1': { honestYearlyPrice: 300, priceAlert: { thresholdPerMonth: 0 } },
        },
        pushToken: { expoPushToken: TOKEN, platform: 'ios' },
      },
    },
  });

describe('lowerOfferPrices', () => {
  test('sænker Standardpris, Kampagnepris og Makkerpris med beløbet', () => {
    const offer = {
      id: 'a',
      standardPrice: { under30: 400, over30: 500 },
      campaignPrice: 349,
      partnerPrice: 450,
      signupFee: 199,
    };
    assert.deepEqual(lowerOfferPrices(offer, 100), {
      id: 'a',
      standardPrice: { under30: 300, over30: 400 },
      campaignPrice: 249,
      partnerPrice: 350,
      signupFee: 199,
    });
  });

  test('højst 30 % pr. pris, så næste nats rigtige pris består sanity-reglen', () => {
    assert.deepEqual(lowerOfferPrices({ standardPrice: 199, campaignPrice: 0 }, 100), {
      standardPrice: 140,
      campaignPrice: 0,
    });
  });
});

describe('runPriceDropDemo', () => {
  test('sænker Centrets priser og sender push i én opdatering', async () => {
    const db = database();
    const pushClient = createFakePushClient();
    const { report } = await runPriceDropDemo({
      db,
      pushClient,
      centerId: 'test-1',
      amount: 50,
      today: TODAY,
    });

    assert.deepEqual(pushClient.messages, [
      {
        to: TOKEN,
        sound: 'default',
        channelId: 'default',
        title: 'Prisfald: Test Center',
        body: 'Ærlig årspris er faldet 50 kr/md til 250 kr/md.',
        data: { centerId: 'test-1', kind: 'favorite' },
      },
    ]);
    assert.equal(report.sent.length, 1);
    assert.equal(db.updates.length, 1);

    const data = db.snapshot();
    assert.equal(data.Offers['test-1'].a.standardPrice, 250);
    assert.equal(data.Offers['test-1'].a.lastSeen, TODAY);
    assert.deepEqual(data.Offers['test-1'].b.standardPrice, { under30: 300, over30: 350 });
    assert.equal(data.Offers['anden-1'].c.standardPrice, 200);
    // Prishistorikken viser kun rigtige priser.
    assert.deepEqual(data.PriceHistory['test-1'].a, { [TODAY]: { standardPrice: 300 } });
    assert.equal(data.Users.anna.favorites['test-1'].honestYearlyPrice, 250);
    assert.equal(data.Users.anna.favorites['anden-1'].honestYearlyPrice, 300);
  });

  test('tør kørsel: intet sendes og intet skrives', async () => {
    const db = database();
    const pushClient = createFakePushClient();
    const { report } = await runPriceDropDemo({
      db,
      pushClient,
      centerId: 'test-1',
      amount: 50,
      today: TODAY,
      dryRun: true,
    });

    assert.equal(pushClient.sendCalls.length, 0);
    assert.equal(db.updates.length, 0);
    assert.deepEqual(
      report.notSent.map((alert) => [alert.centerId, alert.reason]),
      [['test-1', 'tør kørsel']],
    );
  });

  test('ukendt Center eller ugyldigt beløb giver en forståelig fejl', async () => {
    const run = (centerId, amount) =>
      runPriceDropDemo({
        db: database(),
        pushClient: createFakePushClient(),
        centerId,
        amount,
        today: TODAY,
      });
    await assert.rejects(run('findes-ikke', 50), /Centret findes-ikke findes ikke/);
    await assert.rejects(run('test-1', 0), /positivt antal kr\/md/);
  });
});
