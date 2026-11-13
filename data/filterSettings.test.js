import { activeFilterCount, activeFilterLabels, resolveFilterSettings } from './filterSettings';
import { EMPTY_PREFERENCES } from './userProfile';

// Adfærdstests for hvilke Filtre Find bruger.

const PREFERENCES = { ...EMPTY_PREFERENCES, sauna: true, machines: ['Bænkpres'], maxDistanceKm: 5 };

describe('resolveFilterSettings', () => {
  test('uden gemte Filtre er udgangspunktet Præferencerne', () => {
    expect(resolveFilterSettings(null, PREFERENCES)).toEqual({
      filters: PREFERENCES,
      isCustom: false,
    });
  });

  test('gemte Filtre vinder over Præferencerne', () => {
    const stored = {
      filters: { ...EMPTY_PREFERENCES, open24h: true, noBinding: true, maxDistanceKm: 50 },
    };
    expect(resolveFilterSettings(stored, PREFERENCES)).toEqual({
      filters: { ...EMPTY_PREFERENCES, open24h: true, noBinding: true, maxDistanceKm: 50 },
      isCustom: true,
    });
  });

  test('en sortering gemt af en tidligere version ignoreres uden fejl', () => {
    const stored = { filters: { ...EMPTY_PREFERENCES, open24h: true }, sortBy: 'distance' };
    expect(resolveFilterSettings(stored, PREFERENCES)).toEqual({
      filters: { ...EMPTY_PREFERENCES, open24h: true },
      isCustom: true,
    });
    expect(resolveFilterSettings({ filters: null, sortBy: 'priceDesc' }, PREFERENCES)).toEqual({
      filters: PREFERENCES,
      isCustom: false,
    });
  });

  test('ufuldstændige Filtre falder tilbage til standard', () => {
    const stored = { filters: { sauna: 'ja', machines: null, maxDistanceKm: -3 } };
    expect(resolveFilterSettings(stored, PREFERENCES)).toEqual({
      filters: EMPTY_PREFERENCES,
      isCustom: true,
    });
  });

  test('uden Præferencer og uden gemte Filtre bruges tomme Præferencer', () => {
    expect(resolveFilterSettings(undefined, undefined).filters).toEqual(EMPTY_PREFERENCES);
  });
});

describe('activeFilterCount', () => {
  test('tæller slåede Filtre og maskiner, men ikke maks. afstand', () => {
    expect(activeFilterCount(EMPTY_PREFERENCES)).toBe(0);
    expect(
      activeFilterCount({
        ...EMPTY_PREFERENCES,
        sauna: true,
        multiCenterAccess: true,
        machines: ['Bænkpres', 'Squat rack'],
      }),
    ).toBe(4);
  });
});

describe('activeFilterLabels', () => {
  test('giver korte navne til de aktive Filtre og maskinerne', () => {
    const filters = { ...EMPTY_PREFERENCES, sauna: true, noBinding: true, machines: ['Bænkpres'] };
    expect(activeFilterLabels(filters)).toEqual(['Sauna', 'Ingen binding', 'Bænkpres']);
  });

  test('er tom uden aktive Filtre', () => {
    expect(activeFilterLabels(EMPTY_PREFERENCES)).toEqual([]);
    expect(activeFilterLabels(null)).toEqual([]);
  });
});
