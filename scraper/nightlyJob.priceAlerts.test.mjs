// Prisfald og push end-to-end gennem nat-jobbet: en Kæde scrapes, nattens priser skrives til en
// falsk Realtime Database, og opfyldte Prisalarmer sendes med en falsk push-afsender (eller den
// rigtige Expo-afsender med en falsk fetch). Ingen test sender rigtige push.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { CENTERS as SAMPLE_CENTERS, CHAINS as SAMPLE_CHAINS } from '../data/const.js';
import { buildSeedUpdate } from '../data/centerData.js';
import { scrapeSats } from './chains/sats.mjs';
import { createExpoPushClient } from './expoPush.mjs';
import { formatReport, runNightlyJob } from './nightlyJob.mjs';
import { createFakeDatabase } from './testing/fakeDatabase.mjs';
import { createFakeFetch, createFakePushClient } from './testing/fakePush.mjs';
import { createFixtureHttp, satsRoutes, withProps } from './testing/satsFixtures.mjs';

const NIGHT_1 = '2026-10-22';
const NIGHT_2 = '2026-10-23';
const NIGHT_3 = '2026-10-24';

const TOKEN = 'ExponentPushToken[telefon-1]';
const AARHUS = { latitude: 56.1567, longitude: 10.2108 };

// En Kæde med ét Center i Aarhus og ét Tilbud uden gebyrer, så Ærlig årspris er let at regne:
// (kampagnemåneder × Kampagnepris + resten × Standardpris) / 12.
const testChain = ({ standardPrice = 300, campaignPrice, campaignMonths, fail = false } = {}) => ({
  chainId: 'test',
  scrape: async () => {
    if (fail) throw new Error('HTTP 502');
    return {
      chain: { id: 'test', name: 'Testkæde', website: 'https://example.dk', discounts: [] },
      centers: [
        {
          id: 'test-1',
          chainId: 'test',
          name: 'Test Center',
          address: 'Vej 1, 8000 Aarhus C',
          location: AARHUS,
          facilities: {},
          signupUrl: 'https://example.dk/1',
          offers: [
            {
              id: 'test-1-a',
              name: 'Basis',
              subscriptionType: 'Lokal center',
              standardPrice,
              campaignPrice,
              campaignMonths,
              signupFee: 0,
              adminFee: 0,
              bindingMonths: 0,
            },
          ],
        },
      ],
      readErrors: [],
    };
  },
});

const profile = (extra = {}) => ({
  address: 'Vej 2, 8000 Aarhus C',
  location: AARHUS,
  birthDate: '1990-05-01',
  preferences: { maxDistanceKm: 15 },
  ...extra,
});

const pushToken = (expoPushToken = TOKEN) => ({
  expoPushToken,
  platform: 'ios',
  updatedAt: '2026-10-01T10:00:00.000Z',
});

// En bruger med en Prisalarm på Favoritten test-1, gemt ved prisen savedPrice. Uden tærskel
// gemmer appen tærsklen som 0 (toStoredFavorite), da databasen ikke gemmer null.
const favoriteUser = ({ savedPrice = 300, threshold, token = pushToken() } = {}) => ({
  profile: profile(),
  favorites: {
    'test-1': {
      addedAt: '2026-10-01T10:00:00.000Z',
      honestYearlyPrice: savedPrice,
      priceAlert: { thresholdPerMonth: threshold ?? 0 },
    },
  },
  ...(token ? { pushToken: token } : {}),
});

const runNight = (db, today, scrapers, pushClient) =>
  runNightlyJob({ db, today, scrapers, pushClient });

// Nat 1 skriver prisen 300 kr/md; nat 2 kører med de givne priser.
async function priceDrop({ users, night2 = { standardPrice: 250 }, pushClient }) {
  const db = createFakeDatabase({ Users: users });
  const client = pushClient ?? createFakePushClient();
  const first = await runNight(db, NIGHT_1, [testChain()], client);
  const second = await runNight(db, NIGHT_2, [testChain(night2)], client);
  return { db, client, first, second };
}

describe('Prisalarm på en Favorit', () => {
  test('fald over tærsklen: push med Centrets id, ny pris gemt i samme opdatering', async () => {
    const { db, client, second } = await priceDrop({
      users: { anna: favoriteUser({ threshold: 40 }) },
    });

    assert.deepEqual(client.messages, [
      {
        to: TOKEN,
        sound: 'default',
        channelId: 'default',
        title: 'Prisfald: Test Center',
        body: 'Ærlig årspris er faldet 50 kr/md til 250 kr/md.',
        data: { centerId: 'test-1', kind: 'favorite' },
      },
    ]);
    const data = db.snapshot();
    assert.equal(data.Users.anna.favorites['test-1'].honestYearlyPrice, 250);
    // Prisalarmen og resten af Favoritten er urørt.
    assert.deepEqual(data.Users.anna.favorites['test-1'].priceAlert, { thresholdPerMonth: 40 });
    assert.equal(data.Offers['test-1']['test-1-a'].standardPrice, 250);
    // Centerdata og brugerens nye pris skrives i én samlet opdatering pr. nat.
    assert.equal(db.updates.length, 2);
    assert.equal(db.updates[1]['Users/anna/favorites/test-1/honestYearlyPrice'], 250);
    assert.deepEqual(second.report.priceAlerts.sent, [
      { kind: 'favorite', centerId: 'test-1', honestYearlyPrice: 250, savingPerMonth: 50 },
    ]);
  });

  test('samme fald sendes ikke igen næste nat', async () => {
    const { db, client } = await priceDrop({ users: { anna: favoriteUser({ threshold: 40 }) } });
    await runNight(db, NIGHT_3, [testChain({ standardPrice: 250 })], client);

    assert.equal(client.messages.length, 1);
  });

  test('fald under tærsklen: ingen push, intet gemt på brugeren', async () => {
    const users = { anna: favoriteUser({ threshold: 60 }) };
    const { db, client, second } = await priceDrop({ users });

    assert.equal(client.sendCalls.length, 0);
    assert.deepEqual(db.snapshot().Users, users);
    assert.deepEqual(second.report.priceAlerts.sent, []);
  });

  test('fald præcis lig tærsklen udløser alarmen', async () => {
    const { client } = await priceDrop({ users: { anna: favoriteUser({ threshold: 50 }) } });
    assert.equal(client.messages.length, 1);
  });

  test('uden tærskel udløser ethvert fald (her 5 kr/md)', async () => {
    const { db, client } = await priceDrop({
      users: { anna: favoriteUser() },
      night2: { standardPrice: 295 },
    });

    assert.equal(client.messages[0].body, 'Ærlig årspris er faldet 5 kr/md til 295 kr/md.');
    assert.equal(db.snapshot().Users.anna.favorites['test-1'].honestYearlyPrice, 295);
  });

  test('en ny kampagne udløser alarmen ligesom en lavere Standardpris', async () => {
    // 0 kr i 2 måneder, derefter 10 × 300 kr → 3000 / 12 = 250 kr/md.
    const { client } = await priceDrop({
      users: { anna: favoriteUser({ threshold: 40 }) },
      night2: { standardPrice: 300, campaignPrice: 0, campaignMonths: 2 },
    });

    assert.equal(client.messages[0].body, 'Ærlig årspris er faldet 50 kr/md til 250 kr/md.');
  });

  test('en prisstigning giver ingen push', async () => {
    const { client } = await priceDrop({
      users: { anna: favoriteUser() },
      night2: { standardPrice: 350 },
    });
    assert.equal(client.sendCalls.length, 0);
  });

  test('Favorit uden Prisalarm giver ingen push', async () => {
    const user = favoriteUser();
    delete user.favorites['test-1'].priceAlert;
    const { client } = await priceDrop({ users: { anna: user } });
    assert.equal(client.sendCalls.length, 0);
  });

  test('SATS: lavere Standardpris fra den rigtige parser udløser alarmen', async () => {
    const adelgade = 'https://www.sats.dk/traeningscenter/kobenhavn/kbh-adelgade';
    const satsNight = (today, routes = satsRoutes()) => ({
      chainId: 'sats',
      scrape: () => scrapeSats({ http: createFixtureHttp(routes), today }),
    });
    // 30+: Basic 0 kr i 1 måned, derefter 11 × 649 kr → 594,92 kr/md.
    const savedPrice = (11 * 649) / 12;
    const db = createFakeDatabase({
      Users: {
        anna: {
          profile: { ...profile(), location: { latitude: 55.6761, longitude: 12.5683 } },
          favorites: {
            'sats-412': { honestYearlyPrice: savedPrice, priceAlert: { thresholdPerMonth: 40 } },
          },
          pushToken: pushToken(),
        },
      },
    });
    const client = createFakePushClient();
    await runNight(db, NIGHT_1, [satsNight(NIGHT_1)], client);
    assert.equal(client.sendCalls.length, 0);

    const routes = satsRoutes();
    routes[adelgade] = withProps(routes[adelgade], (props) => {
      for (const view of props.becomeMemberSection.views) {
        for (const segment of view.segments) {
          const basic = segment.memberships.find((membership) => membership.name === 'Basic');
          if (basic && segment.id.endsWith('ADULT')) {
            basic.price = view.id === 'under-30' ? '499' : '599';
          }
        }
      }
    });
    await runNight(db, NIGHT_2, [satsNight(NIGHT_2, routes)], client);

    // 11 × 599 / 12 = 549,08 kr/md: faldet 45,83 kr/md.
    assert.equal(client.messages.length, 1);
    assert.equal(client.messages[0].title, 'Prisfald: SATS Adelgade');
    assert.equal(client.messages[0].body, 'Ærlig årspris er faldet 46 kr/md til 549 kr/md.');
    assert.deepEqual(client.messages[0].data, { centerId: 'sats-412', kind: 'favorite' });
    const stored = db.snapshot().Users.anna.favorites['sats-412'].honestYearlyPrice;
    assert.equal(stored, (11 * 599) / 12);
  });
});

describe('Prisalarm på Nuværende medlemskab', () => {
  const memberUser = ({ threshold = 100, notified } = {}) => ({
    profile: profile({ currentMembership: { monthlyPrice: 400 } }),
    currentMembershipAlert: {
      enabledAt: '2026-10-01T10:00:00.000Z',
      thresholdPerMonth: threshold,
      ...(notified == null ? {} : { notifiedHonestYearlyPrice: notified }),
    },
    pushToken: pushToken(),
  });

  test('Tilbud mindst tærsklen billigere end Nuværende medlemskab: push og pris gemt', async () => {
    const db = createFakeDatabase({ Users: { bo: memberUser() } });
    const client = createFakePushClient();
    await runNight(db, NIGHT_1, [testChain()], client);

    assert.deepEqual(client.messages, [
      {
        to: TOKEN,
        sound: 'default',
        channelId: 'default',
        title: 'Spar 100 kr/md',
        body:
          'Test Center koster 300 kr/md i ærlig årspris. ' +
          'Det er billigere end dit nuværende medlemskab.',
        data: { centerId: 'test-1', kind: 'currentMembership' },
      },
    ]);
    const alert = db.snapshot().Users.bo.currentMembershipAlert;
    assert.equal(alert.notifiedHonestYearlyPrice, 300);
    assert.equal(alert.thresholdPerMonth, 100);
  });

  test('samme pris giver ikke besked igen; et billigere Tilbud gør', async () => {
    const db = createFakeDatabase({ Users: { bo: memberUser() } });
    const client = createFakePushClient();
    await runNight(db, NIGHT_1, [testChain()], client);
    await runNight(db, NIGHT_2, [testChain()], client);
    assert.equal(client.messages.length, 1);

    await runNight(db, NIGHT_3, [testChain({ standardPrice: 250 })], client);
    assert.equal(client.messages.length, 2);
    assert.equal(client.messages[1].title, 'Spar 150 kr/md');
    assert.equal(db.snapshot().Users.bo.currentMembershipAlert.notifiedHonestYearlyPrice, 250);
  });

  test('Besparelse under tærsklen: ingen push', async () => {
    const db = createFakeDatabase({ Users: { bo: memberUser({ threshold: 101 }) } });
    const client = createFakePushClient();
    await runNight(db, NIGHT_1, [testChain()], client);

    assert.equal(client.sendCalls.length, 0);
    const alert = db.snapshot().Users.bo.currentMembershipAlert;
    assert.equal(alert.notifiedHonestYearlyPrice, undefined);
  });

  test('uden tærskel er enhver Besparelse nok', async () => {
    const user = memberUser();
    delete user.currentMembershipAlert.thresholdPerMonth;
    user.profile.currentMembership.monthlyPrice = 310;
    const db = createFakeDatabase({ Users: { bo: user } });
    const client = createFakePushClient();
    await runNight(db, NIGHT_1, [testChain()], client);

    assert.equal(client.messages[0].title, 'Spar 10 kr/md');
  });

  test('Centre uden for brugerens maks. afstand tæller ikke', async () => {
    const user = memberUser();
    // København: Test Center i Aarhus er ca. 150 km væk.
    user.profile.location = { latitude: 55.6761, longitude: 12.5683 };
    const db = createFakeDatabase({ Users: { bo: user } });
    const client = createFakePushClient();
    await runNight(db, NIGHT_1, [testChain()], client);

    assert.equal(client.sendCalls.length, 0);
  });
});

describe('Kæder, der ikke blev opdateret', () => {
  test('en Kæde, der er sprunget over, sender intet, selv ved højere gemt pris', async () => {
    const db = createFakeDatabase({ Users: { anna: favoriteUser({ savedPrice: 300 }) } });
    const client = createFakePushClient();
    await runNight(db, NIGHT_1, [testChain()], client);
    // Brugeren gemte Favoritten ved en højere pris, end Kæden har nu.
    await db.ref('Users/anna/favorites/test-1').update({ honestYearlyPrice: 400 });

    const { ok, report } = await runNight(db, NIGHT_2, [testChain({ fail: true })], client);

    assert.equal(ok, false);
    assert.equal(report.chains[0].status, 'skipped');
    assert.equal(client.sendCalls.length, 0);
    assert.equal(db.snapshot().Users.anna.favorites['test-1'].honestYearlyPrice, 400);

    // Næste nat, hvor Kæden opdateres igen, kommer alarmen.
    await runNight(db, NIGHT_3, [testChain()], client);
    assert.equal(client.messages.length, 1);
    assert.equal(client.messages[0].body, 'Ærlig årspris er faldet 100 kr/md til 300 kr/md.');
  });

  test('Nuværende medlemskab: kun Centre fra opdaterede Kæder kan udløse alarmen', async () => {
    const db = createFakeDatabase({
      Users: {
        bo: {
          profile: profile({ currentMembership: { monthlyPrice: 400 } }),
          currentMembershipAlert: { enabledAt: '2026-10-01T10:00:00.000Z' },
          pushToken: pushToken(),
        },
      },
    });
    const client = createFakePushClient();
    await runNight(db, NIGHT_1, [testChain({ fail: true })], client);
    assert.equal(client.sendCalls.length, 0);
  });

  test('Kæder med håndindtastede data (ikke scrapet i nat) giver ingen alarmer', async () => {
    const tree = { Users: {} };
    for (const [path, value] of Object.entries(
      buildSeedUpdate({ chains: SAMPLE_CHAINS, centers: SAMPLE_CENTERS }),
    )) {
      const [root, id] = path.split('/');
      tree[root] = { ...tree[root], [id]: value };
    }
    const seededCenterIds = Object.keys(tree.Centers);
    tree.Users.anna = {
      profile: profile(),
      // Alle seedede Centre som Favorit, gemt til en pris langt over den aktuelle.
      favorites: Object.fromEntries(
        seededCenterIds.map((id) => [
          id,
          { honestYearlyPrice: 2000, priceAlert: { thresholdPerMonth: 0 } },
        ]),
      ),
      pushToken: pushToken(),
    };
    const db = createFakeDatabase(tree);
    const client = createFakePushClient();
    await runNight(db, NIGHT_1, [testChain()], client);

    assert.equal(client.sendCalls.length, 0);
  });
});

describe('push-tokens', () => {
  test('DeviceNotRegistered sletter tokenet; ingen pris gemt; andre får push', async () => {
    const client = createFakePushClient({
      ticketFor: (message) =>
        message.to === 'ExponentPushToken[slettet-app]'
          ? {
              status: 'error',
              message: 'not a registered push notification recipient',
              details: { error: 'DeviceNotRegistered' },
            }
          : { status: 'ok' },
    });
    const { db, second } = await priceDrop({
      users: {
        anna: favoriteUser(),
        carl: favoriteUser({ token: pushToken('ExponentPushToken[slettet-app]') }),
      },
      pushClient: client,
    });

    // Begge beskeder i ét kald til afsenderen.
    assert.equal(client.sendCalls.length, 1);
    assert.equal(client.sendCalls[0].length, 2);
    const users = db.snapshot().Users;
    assert.equal(users.carl.pushToken, undefined);
    assert.equal(users.carl.favorites['test-1'].honestYearlyPrice, 300);
    assert.deepEqual(users.anna.pushToken, pushToken());
    assert.equal(users.anna.favorites['test-1'].honestYearlyPrice, 250);

    const { priceAlerts } = second.report;
    assert.equal(priceAlerts.tokensRemoved, 1);
    assert.deepEqual(priceAlerts.failed, [
      {
        kind: 'favorite',
        centerId: 'test-1',
        honestYearlyPrice: 250,
        savingPerMonth: 50,
        error: 'DeviceNotRegistered',
      },
    ]);
  });

  test('andre fejl: tokenet beholdes, og alarmen prøves igen næste nat', async () => {
    let failing = true;
    const client = createFakePushClient({
      ticketFor: () =>
        failing
          ? { status: 'error', message: 'Rate exceeded', details: { error: 'MessageRateExceeded' } }
          : { status: 'ok' },
    });
    const { db } = await priceDrop({ users: { anna: favoriteUser() }, pushClient: client });

    assert.deepEqual(db.snapshot().Users.anna.pushToken, pushToken());
    assert.equal(db.snapshot().Users.anna.favorites['test-1'].honestYearlyPrice, 300);

    failing = false;
    await runNight(db, NIGHT_3, [testChain({ standardPrice: 250 })], client);
    assert.equal(client.messages.length, 2);
    assert.equal(db.snapshot().Users.anna.favorites['test-1'].honestYearlyPrice, 250);
  });

  test('DeviceNotRegistered i kvitteringen ved næste kørsel sletter tokenet', async () => {
    const db = createFakeDatabase({ Users: { anna: favoriteUser() } });
    const night1 = createFakePushClient();
    await runNight(db, NIGHT_1, [testChain()], night1);
    await runNight(db, NIGHT_2, [testChain({ standardPrice: 250 })], night1);
    assert.deepEqual(db.snapshot().PushTickets, {
      'ticket-1': { uid: 'anna', token: TOKEN, sentAt: NIGHT_2 },
    });

    const night3 = createFakePushClient({
      receipts: {
        'ticket-1': { status: 'error', details: { error: 'DeviceNotRegistered' } },
      },
    });
    // Endnu et fald, men tokenet er ugyldigt: intet sendes.
    const { report } = await runNight(db, NIGHT_3, [testChain({ standardPrice: 200 })], night3);

    assert.deepEqual(night3.receiptCalls, [['ticket-1']]);
    assert.equal(night3.sendCalls.length, 0);
    const data = db.snapshot();
    assert.equal(data.Users.anna.pushToken, undefined);
    assert.equal(data.PushTickets, undefined);
    assert.equal(data.Users.anna.favorites['test-1'].honestYearlyPrice, 250);
    assert.equal(report.priceAlerts.tokensRemoved, 1);
    assert.equal(report.priceAlerts.notSent[0].reason, 'intet push-token');
  });

  test('en kvittering for et gammelt token sletter ikke et nyt token', async () => {
    const db = createFakeDatabase({
      Users: { anna: favoriteUser({ token: pushToken('ExponentPushToken[ny-telefon]') }) },
      PushTickets: { 'ticket-old': { uid: 'anna', token: TOKEN, sentAt: NIGHT_1 } },
    });
    const client = createFakePushClient({
      receipts: { 'ticket-old': { status: 'error', details: { error: 'DeviceNotRegistered' } } },
    });
    await runNight(db, NIGHT_2, [testChain()], client);

    const data = db.snapshot();
    assert.equal(data.Users.anna.pushToken.expoPushToken, 'ExponentPushToken[ny-telefon]');
    assert.equal(data.PushTickets, undefined);
  });

  test('kvitteringer, der ikke kan hentes, prøves igen og glemmes efter 2 dage', async () => {
    const db = createFakeDatabase({
      PushTickets: {
        fresh: { uid: 'anna', token: TOKEN, sentAt: NIGHT_2 },
        old: { uid: 'anna', token: TOKEN, sentAt: NIGHT_1 },
      },
    });
    const client = createFakePushClient();
    client.getReceipts = async () => {
      throw new Error('HTTP 503');
    };
    const { report } = await runNight(db, NIGHT_3, [testChain()], client);

    assert.deepEqual(Object.keys(db.snapshot().PushTickets), ['fresh']);
    assert.deepEqual(report.priceAlerts.errors, ['Kvitteringer kunne ikke hentes: HTTP 503']);
  });

  test('ugyldigt eller manglende token: intet sendes, slettes eller gemmes', async () => {
    const users = {
      anna: favoriteUser({ token: pushToken('ikke-et-expo-token') }),
      bo: favoriteUser({ token: null }),
    };
    const { db, client, second } = await priceDrop({ users });

    assert.equal(client.sendCalls.length, 0);
    assert.deepEqual(db.snapshot().Users, users);
    assert.deepEqual(
      second.report.priceAlerts.notSent.map((alert) => alert.reason),
      ['ugyldigt push-token', 'intet push-token'],
    );
  });
});

describe('afsendelse', () => {
  test('mange alarmer sendes i bundter på højst 100 pr. kald til Expo', async () => {
    const users = Object.fromEntries(
      Array.from({ length: 150 }, (_, i) => [
        `bruger-${i}`,
        favoriteUser({ token: pushToken(`ExponentPushToken[telefon-${i}]`) }),
      ]),
    );
    const fetch = createFakeFetch();
    const { db, second } = await priceDrop({
      users,
      pushClient: createExpoPushClient({ fetch }),
    });

    const sends = fetch.requests.filter((request) => request.url.endsWith('/push/send'));
    assert.deepEqual(
      sends.map((request) => request.body.length),
      [100, 50],
    );
    assert.equal(second.report.priceAlerts.sent.length, 150);
    assert.equal(db.snapshot().Users['bruger-149'].favorites['test-1'].honestYearlyPrice, 250);
    assert.equal(Object.keys(db.snapshot().PushTickets).length, 150);
  });

  test('fejler Expo helt, skrives nattens priser stadig, men ingen brugerpriser', async () => {
    const fetch = createFakeFetch((url) => {
      if (url.endsWith('/push/send')) throw new Error('fetch failed');
      return { status: 200, json: { data: {} } };
    });
    const { db, second } = await priceDrop({
      users: { anna: favoriteUser() },
      pushClient: createExpoPushClient({ fetch }),
    });

    assert.equal(second.ok, true);
    assert.equal(db.snapshot().Offers['test-1']['test-1-a'].standardPrice, 250);
    assert.equal(db.snapshot().Users.anna.favorites['test-1'].honestYearlyPrice, 300);
    assert.equal(second.report.priceAlerts.failed[0].error, 'fetch failed');
  });

  test('en tør kørsel sender intet og skriver intet, men viser alarmen i rapporten', async () => {
    const db = createFakeDatabase({ Users: { anna: favoriteUser({ savedPrice: 400 }) } });
    const client = createFakePushClient();
    const { report } = await runNightlyJob({
      db,
      today: NIGHT_1,
      scrapers: [testChain()],
      pushClient: client,
      dryRun: true,
    });

    assert.equal(client.sendCalls.length, 0);
    assert.equal(client.receiptCalls.length, 0);
    assert.equal(db.updates.length, 0);
    assert.deepEqual(report.priceAlerts.notSent, [
      {
        kind: 'favorite',
        centerId: 'test-1',
        honestYearlyPrice: 300,
        savingPerMonth: 100,
        reason: 'tør kørsel',
      },
    ]);
  });

  test('rapporten viser alarmerne uden uid’er og tokens', async () => {
    const { second } = await priceDrop({ users: { anna: favoriteUser() } });
    const markdown = formatReport(second.report);

    assert.match(markdown, /## Prisalarmer \(push\)/);
    assert.match(markdown, /- Sendt: 1/);
    assert.match(markdown, /- Sendt: Favorit test-1: 250 kr\/md, spar 50 kr\/md/);
    assert.doesNotMatch(markdown, /anna|ExponentPushToken/);
  });
});
