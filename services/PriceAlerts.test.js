// Gem og hent af Prisalarmen på Nuværende medlemskab og push-tokenet: i Realtime Database under
// Users/<uid>, hvor nat-jobbet læser dem, med en lokal kopi i AsyncStorage. Databasen er en
// falsk i hukommelsen, der sender ændringer til lyttere ligesom den rigtige.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { newCurrentMembershipAlert } from '../data/priceAlerts';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockDatabase = { data: {}, listeners: {}, configured: true };

function mockNotify(path) {
  (mockDatabase.listeners[path] ?? []).forEach((callback) =>
    callback({ val: () => mockDatabase.data[path] ?? null }),
  );
}

jest.mock('../database/firebase', () => ({
  get rtdb() {
    return mockDatabase.configured ? {} : null;
  },
}));

jest.mock('firebase/database', () => ({
  ref: (db, path) => path,
  onValue: (path, callback) => {
    mockDatabase.listeners[path] = [...(mockDatabase.listeners[path] ?? []), callback];
    Promise.resolve().then(() => callback({ val: () => mockDatabase.data[path] ?? null }));
    return () => {
      mockDatabase.listeners[path] = mockDatabase.listeners[path].filter((c) => c !== callback);
    };
  },
  set: async (path, value) => {
    mockDatabase.data[path] = value;
    mockNotify(path);
  },
  remove: async (path) => {
    delete mockDatabase.data[path];
    mockNotify(path);
  },
}));

const {
  clearLocalPriceAlerts,
  savePushToken,
  storeCurrentMembershipAlert,
  subscribeCurrentMembershipAlert,
} = require('./PriceAlerts');

const ALERT = newCurrentMembershipAlert({
  thresholdPerMonth: 50,
  now: new Date('2026-10-22T10:00:00.000Z'),
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  mockDatabase.data = {};
  mockDatabase.listeners = {};
  mockDatabase.configured = true;
  await AsyncStorage.clear();
});

test('Prisalarmen gemmes under brugerens uid, hvor nat-jobbet kan læse den', async () => {
  await storeCurrentMembershipAlert('u1', ALERT);

  expect(mockDatabase.data['Users/u1/currentMembershipAlert']).toEqual(ALERT);
});

test('Prisalarmen følges fra databasen, også når den ændres et andet sted', async () => {
  const seen = [];
  const stop = subscribeCurrentMembershipAlert('u1', (alert) => seen.push(alert));
  await flush();

  mockDatabase.data['Users/u1/currentMembershipAlert'] = { ...ALERT, thresholdPerMonth: null };
  mockNotify('Users/u1/currentMembershipAlert');
  await flush();
  stop();

  expect(seen.at(-1)).toEqual({ ...ALERT, thresholdPerMonth: null });
});

test('slået fra fjernes alarmen fra databasen', async () => {
  await storeCurrentMembershipAlert('u1', ALERT);
  await storeCurrentMembershipAlert('u1', null);

  expect(mockDatabase.data['Users/u1/currentMembershipAlert']).toBeUndefined();
});

test('uden Firebase huskes alarmen kun på telefonen', async () => {
  mockDatabase.configured = false;
  await storeCurrentMembershipAlert(null, ALERT);

  const seen = [];
  subscribeCurrentMembershipAlert(null, (alert) => seen.push(alert));
  await flush();

  expect(seen).toEqual([ALERT]);
  expect(mockDatabase.data).toEqual({});
});

test('push-tokenet gemmes på brugeren med platform og tidspunkt', async () => {
  const saved = await savePushToken('u1', 'ExponentPushToken[abc]', 'ios');

  expect(saved).toBe(true);
  expect(mockDatabase.data['Users/u1/pushToken']).toMatchObject({
    expoPushToken: 'ExponentPushToken[abc]',
    platform: 'ios',
  });
  expect(typeof mockDatabase.data['Users/u1/pushToken'].updatedAt).toBe('string');
});

test('uden Firebase kan push-tokenet ikke gemmes', async () => {
  mockDatabase.configured = false;

  expect(await savePushToken('u1', 'ExponentPushToken[abc]', 'ios')).toBe(false);
});

test('log ud fjerner alarmen fra telefonen og telefonens push-token fra kontoen', async () => {
  await storeCurrentMembershipAlert('u1', ALERT);
  await savePushToken('u1', 'ExponentPushToken[abc]', 'ios');

  await clearLocalPriceAlerts('u1');

  expect(await AsyncStorage.getItem('gymfinder:currentMembershipAlert:u1')).toBeNull();
  expect(mockDatabase.data['Users/u1/pushToken']).toBeUndefined();
  expect(mockDatabase.data['Users/u1/currentMembershipAlert']).toEqual(ALERT);
});
