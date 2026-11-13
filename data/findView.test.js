import {
  DEFAULT_LOCATION,
  centerKeywords,
  discountProfileText,
  facilityTags,
  sampleDataNotice,
  loosenFilterSuggestions,
  mapRegion,
  notStatedWithoutFacilities,
  otherCentersLabel,
  pinKind,
} from './findView';

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

describe('facilityTags', () => {
  const statuses = (tags) => tags.map((tag) => `${tag.key}:${tag.status}`);

  test('ønskede står først, derefter ikke oplyste ønsker og til sidst de andre', () => {
    const center = { facilities: { sauna: true, groupClasses: null, open24h: true } };
    const { tags } = facilityTags(center, { groupClasses: true, open24h: true });
    expect(statuses(tags)).toEqual(['open24h:wanted', 'groupClasses:notStated', 'sauna:other']);
  });

  test('giver mærker med navn og skærmlæser-tekst efter status', () => {
    const center = { facilities: { sauna: true, groupClasses: null, open24h: true } };
    const { tags } = facilityTags(center, { sauna: true, groupClasses: true });
    expect(tags).toEqual([
      { key: 'sauna', label: 'Sauna', status: 'wanted', accessibilityLabel: 'Sauna, ønsket' },
      {
        key: 'groupClasses',
        label: 'Holdtræning',
        status: 'notStated',
        accessibilityLabel: 'Holdtræning, ikke oplyst',
      },
      { key: 'open24h', label: 'Døgnåbent', status: 'other', accessibilityLabel: 'Døgnåbent' },
    ]);
  });

  test('viser ikke faciliteter, der mangler eller er ukendte uden at være ønsket', () => {
    const center = { facilities: { sauna: false, groupClasses: null } };
    expect(facilityTags(center, {}).tags).toEqual([]);
    expect(facilityTags({}, null).tags).toEqual([]);
  });

  test('uden Filtre er alle Centrets faciliteter "andre"', () => {
    const center = { facilities: { sauna: true, groupClasses: true } };
    expect(statuses(facilityTags(center, undefined).tags)).toEqual([
      'sauna:other',
      'groupClasses:other',
    ]);
  });

  // Flere faciliteter end de tre nuværende, så grænsen og "+N mere" kan testes.
  const MANY = ['sauna', 'groupClasses', 'open24h', 'pool', 'spa', 'parking', 'crossfit', 'boxing'];
  const MANY_LABELS = {
    sauna: 'Sauna',
    groupClasses: 'Holdtræning',
    open24h: 'Døgnåbent',
    pool: 'Svømmehal',
    spa: 'Spa',
    parking: 'Parkering',
    crossfit: 'Crossfit',
    boxing: 'Boksning',
  };
  const manyCenter = {
    facilities: Object.fromEntries(MANY.map((key) => [key, key !== 'crossfit' ? true : null])),
  };

  test('virker med flere faciliteter end de tre nuværende', () => {
    const { tags } = facilityTags(
      manyCenter,
      { boxing: true, crossfit: true },
      { facilities: MANY, labels: MANY_LABELS },
    );
    expect(statuses(tags)).toEqual([
      'boxing:wanted',
      'crossfit:notStated',
      'sauna:other',
      'groupClasses:other',
      'open24h:other',
      'pool:other',
      'spa:other',
      'parking:other',
    ]);
    expect(tags[0].accessibilityLabel).toBe('Boksning, ønsket');
    expect(tags[1].accessibilityLabel).toBe('Crossfit, ikke oplyst');
  });

  test('viser højst 6 mærker og skjuler resten bag "+N mere"', () => {
    const result = facilityTags(
      manyCenter,
      { boxing: true },
      {
        facilities: MANY,
        labels: MANY_LABELS,
      },
    );
    expect(result.tags).toHaveLength(7);
    expect(result.visible.map((tag) => tag.key)).toEqual([
      'boxing',
      'sauna',
      'groupClasses',
      'open24h',
      'pool',
      'spa',
    ]);
    expect(result.hidden.map((tag) => tag.key)).toEqual(['parking']);
    expect(result.hiddenCount).toBe(1);
  });

  test('grænsen kan sættes lavere (rækkerne for de andre Centre viser højst 4)', () => {
    const result = facilityTags(
      manyCenter,
      {},
      {
        facilities: MANY,
        labels: MANY_LABELS,
        limit: 4,
      },
    );
    expect(result.visible).toHaveLength(4);
    expect(result.hiddenCount).toBe(3);
  });

  test('skjuler intet, når der er 6 mærker eller færre', () => {
    const center = { facilities: { sauna: true, groupClasses: true, open24h: true } };
    const result = facilityTags(center, {});
    expect(result.visible).toHaveLength(3);
    expect(result.hidden).toEqual([]);
    expect(result.hiddenCount).toBe(0);
  });
});

describe('notStatedWithoutFacilities', () => {
  test('beholder binding, abonnementstype og maskiner, men ikke faciliteterne (de er mærker)', () => {
    expect(
      notStatedWithoutFacilities([
        'sauna',
        'machines',
        'groupClasses',
        'binding',
        'subscriptionType',
      ]),
    ).toEqual(['machines', 'binding', 'subscriptionType']);
    expect(notStatedWithoutFacilities(['open24h'])).toEqual([]);
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
      'Slå Landsdækkende fra',
      'Tillad Binding',
      'Fjern krav om maskiner (Romaskine)',
    ]);
  });

  test('uden brugerens placering foreslås en adresse i stedet for større afstand', () => {
    const filters = { maxDistanceKm: 15, sauna: true };
    expect(loosenFilterSuggestions(filters, { hasLocation: false })).toEqual([
      'Angiv din adresse på Profil, så afstanden til Centrene kan beregnes',
      'Slå Sauna fra',
    ]);
  });

  test('giver ingen forslag uden Filtre', () => {
    expect(loosenFilterSuggestions(undefined)).toEqual([]);
    expect(loosenFilterSuggestions({ machines: [], sauna: false })).toEqual([]);
  });
});

describe('discountProfileText', () => {
  test('viser Rabatgrupperne, priserne er regnet med', () => {
    expect(discountProfileText(['student'])).toBe('Priser regnet med: Studerende');
    expect(discountProfileText(['student', 'partner'])).toBe(
      'Priser regnet med: Studerende, Træn med en makker',
    );
  });

  test('siger det, når Rabatprofilen er tom', () => {
    expect(discountProfileText([])).toBe('Priser uden Rabat');
    expect(discountProfileText(undefined)).toBe('Priser uden Rabat');
  });
});

describe('sampleDataNotice', () => {
  test('forklarer, hvorfor der vises eksempeldata', () => {
    expect(sampleDataNotice({ configured: false })).toMatch(/ikke er forbundet/);
    expect(sampleDataNotice({ configured: true, failed: true })).toMatch(/ikke kunne læses/);
    expect(sampleDataNotice({ configured: true, failed: false })).toMatch(/endnu ikke er hentet/);
  });
});

describe('pinKind', () => {
  const chainMatch = (id) => ({ best: { center: { id } }, others: [] });
  const chains = [chainMatch('a1'), chainMatch('b1')];

  test('Anbefalet har den største pin', () => {
    expect(pinKind('a1', { chains, recommendedId: 'a1' })).toBe('recommended');
  });

  test('hver Kædes bedste Center er fremhævet', () => {
    expect(pinKind('b1', { chains, recommendedId: 'a1' })).toBe('chainBest');
    expect(pinKind('a1', { chains, recommendedId: null })).toBe('chainBest');
  });

  test('Kædens andre Centre er almindelige pins', () => {
    expect(pinKind('a2', { chains, recommendedId: 'a1' })).toBe('center');
  });
});

describe('otherCentersLabel', () => {
  test('"N andre centre i {Kæde}"', () => {
    expect(otherCentersLabel(3, { name: 'PureGym' })).toBe('3 andre centre i PureGym');
    expect(otherCentersLabel(1, { name: 'SATS' })).toBe('1 andet center i SATS');
  });

  test('uden Kædens navn står der "kæden"', () => {
    expect(otherCentersLabel(2, { name: null })).toBe('2 andre centre i kæden');
  });
});
