// Gem og hent af Favoritter: i Realtime Database under Users/<uid>/favorites, med en lokal kopi
// i AsyncStorage, så de huskes uden Firebase-nøgler. Databasen er en falsk i hukommelsen, der
// sender ændringer til lyttere ligesom den rigtige, så testene ikke bruger netværk.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { newFavorite } from '../data/favorites';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockDatabase = { data: {}, listeners: {}, configured: true };

// Stier som 'Users/u1/favorites/a' gemmes fladt; en læsning af 'Users/u1/favorites' samler
// børnene, ligesom databasen gør.
function mockRead(path) {
  const prefix = `${path}/`;
  const children = Object.entries(mockDatabase.data).filter(([key]) => key.startsWith(prefix));
  if (children.length === 0) return null;
  return Object.fromEntries(children.map(([key, value]) => [key.slice(prefix.length), value]));
}

function mockNotify() {
  Object.entries(mockDatabase.listeners).forEach(([path, callbacks]) =>
    callbacks.forEach((callback) => callback({ val: () => mockRead(path) })),
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
    Promise.resolve().then(() => callback({ val: () => mockRead(path) }));
    return () => {
      mockDatabase.listeners[path] = mockDatabase.listeners[path].filter((c) => c !== callback);
    };
  },
  set: async (path, value) => {
    mockDatabase.data[path] = value;
    mockNotify();
  },
  remove: async (path) => {
    delete mockDatabase.data[path];
    mockNotify();
  },
  update: async (path, values) => {
    Object.entries(values).forEach(([key, value]) => {
      mockDatabase.data[`${path}/${key}`] = value;
    });
    mockNotify();
  },
}));

const { clearLocalFavorites, storeFavorite, subscribeFavorites } = require('./Favorites');

const FAVORITE = newFavorite({
  honestYearlyPrice: 249,
  now: new Date('2026-10-22T10:00:00.000Z'),
});

// Følger Favoritterne og returnerer den seneste værdi, når de er faldet til ro.
async function watch(uid) {
  const seen = [];
  const unsubscribe = subscribeFavorites(uid, (favorites) => seen.push(favorites));
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return seen[seen.length - 1];
  };
  return { seen, settle, unsubscribe };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockDatabase.data = {};
  mockDatabase.listeners = {};
  mockDatabase.configured = true;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

test('en Favorit gemmes på sin egen sti under brugerens uid', async () => {
  await storeFavorite('u1', { a: FAVORITE }, 'a');

  expect(mockDatabase.data).toEqual({ 'Users/u1/favorites/a': FAVORITE });
});

test('at fjerne en Favorit sletter kun dens sti', async () => {
  await storeFavorite('u1', { a: FAVORITE, b: FAVORITE }, 'a');
  await storeFavorite('u1', { a: FAVORITE, b: FAVORITE }, 'b');

  await storeFavorite('u1', { b: FAVORITE }, 'a');

  expect(Object.keys(mockDatabase.data)).toEqual(['Users/u1/favorites/b']);
});

test('Favoritterne følger kontoen: en ny telefon får dem fra databasen', async () => {
  mockDatabase.data['Users/u1/favorites/a'] = FAVORITE;

  const { settle, unsubscribe } = await watch('u1');

  expect(await settle()).toEqual({ a: FAVORITE });
  unsubscribe();
});

test('ændringer fra en anden telefon slår igennem', async () => {
  const { settle, unsubscribe } = await watch('u1');
  expect(await settle()).toEqual({});

  mockDatabase.data['Users/u1/favorites/b'] = FAVORITE;
  mockNotify();

  expect(await settle()).toEqual({ b: FAVORITE });
  unsubscribe();
});

test('uden Firebase huskes Favoritterne på telefonen efter genstart', async () => {
  mockDatabase.configured = false;
  await storeFavorite(null, { a: FAVORITE }, 'a');

  const { settle, unsubscribe } = await watch(null);

  expect(await settle()).toEqual({ a: FAVORITE });
  expect(mockDatabase.data).toEqual({});
  unsubscribe();
});

test('uden forbindelse vises den lokale kopi fra sidst', async () => {
  await storeFavorite('u1', { a: FAVORITE }, 'a');
  mockDatabase.data = {};
  // Databasen svarer aldrig.
  const firebaseDatabase = require('firebase/database');
  const onValue = jest.spyOn(firebaseDatabase, 'onValue').mockImplementation(() => () => {});

  const { settle, unsubscribe } = await watch('u1');

  expect(await settle()).toEqual({ a: FAVORITE });
  unsubscribe();
  onValue.mockRestore();
});

test('Favoritter gemt uden login lægges op på brugeren, når der kommer en uid', async () => {
  mockDatabase.configured = false;
  await storeFavorite(null, { a: FAVORITE }, 'a');
  mockDatabase.configured = true;

  const { settle, unsubscribe } = await watch('u1');

  expect(await settle()).toEqual({ a: FAVORITE });
  expect(mockDatabase.data).toEqual({ 'Users/u1/favorites/a': FAVORITE });
  expect(await AsyncStorage.getItem('gymfinder:favorites:local')).toBeNull();
  unsubscribe();
});

test('log ud fjerner Favoritterne fra telefonen, men ikke fra kontoen', async () => {
  mockDatabase.configured = false;
  await storeFavorite('u1', { a: FAVORITE }, 'a');

  await clearLocalFavorites('u1');

  const { settle, unsubscribe } = await watch('u1');
  expect(await settle()).toEqual({});
  unsubscribe();
});
