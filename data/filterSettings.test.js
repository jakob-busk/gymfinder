import { DEFAULT_SORT, activeFilterCount, resolveFilterSettings } from './filterSettings';
import { EMPTY_PREFERENCES } from './userProfile';

// Adfærdstests for hvilke Filtre og hvilken sortering Find bruger.

const PREFERENCES = { ...EMPTY_PREFERENCES, sauna: true, machines: ['Bænkpres'], maxDistanceKm: 5 };

describe('resolveFilterSettings', () => {
  test('uden gemte Filtre er udgangspunktet Præferencerne og Ærlig årspris', () => {
    expect(resolveFilterSettings(null, PREFERENCES)).toEqual({
      filters: PREFERENCES,
      sortBy: 'honestYearlyPrice',
      isCustom: false,
    });
    expect(DEFAULT_SORT).toBe('honestYearlyPrice');
  });

  test('gemte Filtre vinder over Præferencerne', () => {
    const stored = {
      filters: { ...EMPTY_PREFERENCES, open24h: true, noBinding: true, maxDistanceKm: 50 },
      sortBy: 'distance',
    };
    expect(resolveFilterSettings(stored, PREFERENCES)).toEqual({
      filters: { ...EMPTY_PREFERENCES, open24h: true, noBinding: true, maxDistanceKm: 50 },
      sortBy: 'distance',
      isCustom: true,
    });
  });

  test('kun gemt sortering: Filtrene følger stadig Præferencerne', () => {
    expect(resolveFilterSettings({ filters: null, sortBy: 'priceDesc' }, PREFERENCES)).toEqual({
      filters: PREFERENCES,
      sortBy: 'priceDesc',
      isCustom: false,
    });
  });

  test('ukendt sortering og ufuldstændige Filtre falder tilbage til standard', () => {
    const stored = { filters: { sauna: 'ja', machines: null, maxDistanceKm: -3 }, sortBy: 'rating' };
    expect(resolveFilterSettings(stored, PREFERENCES)).toEqual({
      filters: EMPTY_PREFERENCES,
      sortBy: 'honestYearlyPrice',
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
