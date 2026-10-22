// Filtre og sortering huskes på telefonen (AsyncStorage) og kan nulstilles.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveFilterSettings } from '../data/filterSettings';
import { EMPTY_PREFERENCES } from '../data/userProfile';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const {
  clearFilterSettings,
  loadFilterSettings,
  saveFilterSettings,
} = require('./FilterSettings');

const PREFERENCES = { ...EMPTY_PREFERENCES, groupClasses: true };

beforeEach(() => AsyncStorage.clear());

test('intet gemt: Filtrene er Præferencerne', async () => {
  expect(await loadFilterSettings()).toBeNull();
  expect(resolveFilterSettings(await loadFilterSettings(), PREFERENCES).filters).toEqual(
    PREFERENCES,
  );
});

test('gemte Filtre og sortering hentes igen (som efter genstart)', async () => {
  const filters = { ...EMPTY_PREFERENCES, sauna: true, maxDistanceKm: 50 };
  await saveFilterSettings({ filters, sortBy: 'quarterlyPrice' });

  expect(resolveFilterSettings(await loadFilterSettings(), PREFERENCES)).toEqual({
    filters,
    sortBy: 'quarterlyPrice',
    isCustom: true,
  });
});

test('nulstil giver Præferencerne og standard-sorteringen tilbage', async () => {
  await saveFilterSettings({ filters: { ...EMPTY_PREFERENCES, sauna: true }, sortBy: 'distance' });
  await clearFilterSettings();

  expect(resolveFilterSettings(await loadFilterSettings(), PREFERENCES)).toEqual({
    filters: PREFERENCES,
    sortBy: 'honestYearlyPrice',
    isCustom: false,
  });
});

test('ødelagte data giver standardværdierne i stedet for en fejl', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  await AsyncStorage.setItem('gymfinder:filterSettings', '{ikke json');

  expect(await loadFilterSettings()).toBeNull();
  consoleError.mockRestore();
});
