import { DEFAULT_LOCATION, centerKeywords, loosenFilterSuggestions, mapRegion } from './findView';

// Adfærdstests for visningslogikken på Find. Tallene er regnet ud på forhånd.

const HOME = { latitude: 55.68, longitude: 12.56 };

function match(latitude, longitude) {
  return { center: { id: `${latitude},${longitude}`, location: { latitude, longitude } } };
}

describe('mapRegion', () => {
  test('viser København, når der hverken er placering eller Centre', () => {
    expect(mapRegion(null, [])).toEqual({
      ...DEFAULT_LOCATION,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  });

  test('centrerer på brugeren med mindste udsnit, når der ingen Centre er', () => {
    expect(mapRegion(HOME, [])).toEqual({
      latitude: 55.68,
      longitude: 12.56,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  });

  test('dækker brugeren og alle Centre med luft rundt om', () => {
    const region = mapRegion(HOME, [match(55.78, 12.56), match(55.68, 12.36)]);
    expect(region.latitude).toBeCloseTo(55.73, 6);
    expect(region.longitude).toBeCloseTo(12.46, 6);
    expect(region.latitudeDelta).toBeCloseTo(0.14, 6);
    expect(region.longitudeDelta).toBeCloseTo(0.28, 6);
  });

  test('dækker Centrene, når brugeren ikke har en placering', () => {
    const region = mapRegion(null, [match(55.7, 12.5), match(55.6, 12.5)]);
    expect(region.latitude).toBeCloseTo(55.65, 6);
    expect(region.longitude).toBeCloseTo(12.5, 6);
    expect(region.latitudeDelta).toBeCloseTo(0.14, 6);
    expect(region.longitudeDelta).toBe(0.02);
  });
});

describe('centerKeywords', () => {
  test('viser kun faciliteter, Centret med sikkerhed har', () => {
    const center = { facilities: { sauna: true, groupClasses: null, open24h: true } };
    expect(centerKeywords(center)).toEqual(['Sauna', 'Døgnåbent']);
  });

  test('giver ingen nøgleord, når faciliteterne er ukendte eller mangler', () => {
    expect(centerKeywords({ facilities: { sauna: false } })).toEqual([]);
    expect(centerKeywords({})).toEqual([]);
  });
});

describe('loosenFilterSuggestions', () => {
  test('foreslår at øge maks. afstand og slå de aktive Filtre fra', () => {
    const filters = {
      maxDistanceKm: 5,
      sauna: true,
      groupClasses: false,
      open24h: true,
      multiCenterAccess: true,
      noBinding: true,
      machines: ['Romaskine'],
    };
    expect(loosenFilterSuggestions(filters)).toEqual([
      'Øg maks. afstand (nu 5 km)',
      'Slå Sauna fra',
      'Slå Døgnåbent fra',
      'Slå "Adgang til flere centre" fra',
      'Tillad Binding',
      'Fjern krav om maskiner (Romaskine)',
    ]);
  });

  test('giver ingen forslag uden Filtre', () => {
    expect(loosenFilterSuggestions(undefined)).toEqual([]);
    expect(loosenFilterSuggestions({ machines: [], sauna: false })).toEqual([]);
  });
});
