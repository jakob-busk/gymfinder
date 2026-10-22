// Gem og hent af brugerens profil: i Realtime Database under Users/<uid>/profile, med en lokal
// kopi i AsyncStorage, så appen også virker uden Firebase-nøgler. Databasen er en falsk
// i hukommelsen, så testene ikke bruger netværk.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_PREFERENCES } from '../data/userProfile';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockDatabase = { data: {}, failReads: false, configured: true };

jest.mock('../database/firebase', () => ({
  get rtdb() {
    return mockDatabase.configured ? {} : null;
  },
}));

jest.mock('firebase/database', () => ({
  ref: (db, path) => path,
  get: async (path) => {
    if (mockDatabase.failReads) throw new Error('Client is offline');
    return { val: () => mockDatabase.data[path] ?? null };
  },
  set: async (path, value) => {
    mockDatabase.data[path] = value;
  },
}));

const {
  clearLocalUserData,
  loadOnboardingDone,
  loadUserProfile,
  saveOnboardingDone,
  saveUserProfile,
} = require('./UserProfile');

const PROFILE = {
  address: 'Østerbrogade 79, 2100 København Ø',
  location: { latitude: 55.7027, longitude: 12.5781 },
  birthDate: '1997-03-12',
  discountProfile: ['aeldreSagen'],
  currentMembership: { monthlyPrice: 279, chainId: null },
  preferences: { ...EMPTY_PREFERENCES, open24h: true },
  onboardingCompletedAt: '2026-10-22T10:00:00.000Z',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  mockDatabase.data = {};
  mockDatabase.failReads = false;
  mockDatabase.configured = true;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

test('profilen gemmes under Users/<uid>/profile og huskes', async () => {
  await saveUserProfile('uid-1', PROFILE);

  expect(mockDatabase.data['Users/uid-1/profile']).toEqual(PROFILE);
  expect(await loadUserProfile('uid-1')).toEqual(PROFILE);
});

test('hver bruger har sin egen profil', async () => {
  await saveUserProfile('uid-1', PROFILE);

  expect(await loadUserProfile('uid-2')).toBeNull();
});

test('databasens profil vinder over den lokale kopi', async () => {
  await saveUserProfile('uid-1', PROFILE);
  mockDatabase.data['Users/uid-1/profile'] = { ...PROFILE, address: 'Ny adresse 1' };

  expect((await loadUserProfile('uid-1')).address).toBe('Ny adresse 1');
});

test('uden forbindelse til databasen bruges den lokale kopi', async () => {
  await saveUserProfile('uid-1', PROFILE);
  mockDatabase.failReads = true;

  expect(await loadUserProfile('uid-1')).toEqual(PROFILE);
});

test('uden Firebase gemmes profilen kun lokalt og huskes stadig', async () => {
  mockDatabase.configured = false;

  await saveUserProfile(null, PROFILE);

  expect(mockDatabase.data).toEqual({});
  expect(await loadUserProfile(null)).toEqual(PROFILE);
});

test('en profil gemt før login følger med til den anonyme bruger', async () => {
  mockDatabase.configured = false;
  await saveUserProfile(null, PROFILE);
  mockDatabase.configured = true;

  expect(await loadUserProfile('uid-1')).toEqual(PROFILE);
});

test('ny bruger har ingen profil', async () => {
  expect(await loadUserProfile('uid-1')).toBeNull();
});

test('onboarding-status huskes på telefonen', async () => {
  expect(await loadOnboardingDone()).toBe(false);

  await saveOnboardingDone();

  expect(await loadOnboardingDone()).toBe(true);
});

test('efter log ud er telefonen ryddet, men profilen ligger stadig på kontoen', async () => {
  await saveUserProfile('uid-1', PROFILE);
  await saveOnboardingDone();

  await clearLocalUserData('uid-1');

  expect(await loadOnboardingDone()).toBe(false);
  expect(await loadUserProfile('uid-2')).toBeNull();
  mockDatabase.failReads = true;
  expect(await loadUserProfile('uid-1')).toBeNull();
  mockDatabase.failReads = false;
  expect(await loadUserProfile('uid-1')).toEqual(PROFILE);
});

test('profilen fra databasen huskes på telefonen, så den også findes uden net', async () => {
  // Fx login på en ny telefon: profilen findes kun i databasen.
  mockDatabase.data['Users/uid-1/profile'] = PROFILE;
  expect(await loadUserProfile('uid-1')).toEqual(PROFILE);

  mockDatabase.failReads = true;

  expect(await loadUserProfile('uid-1')).toEqual(PROFILE);
});
