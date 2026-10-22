import {
  formatPhotonAddress,
  gsearchLocation,
  gsearchUrl,
  isSearchable,
  parseGSearchResults,
  parsePhotonResults,
  photonSearchUrl,
  utm32ToWgs84,
} from './addressSearch';

const photonFeature = (properties, coordinates) => ({
  type: 'Feature',
  properties: { countrycode: 'DK', ...properties },
  geometry: { type: 'Point', coordinates },
});

describe('hvornår der søges', () => {
  test.each([
    ['', false],
    ['Øs', false],
    ['  Øs  ', false],
    ['Øst', true],
  ])('"%s" → %s', (query, expected) => {
    expect(isSearchable(query)).toBe(expected);
  });
});

describe('Photon', () => {
  test('URL begrænser til Danmark og til adresser, veje og byer', () => {
    const url = photonSearchUrl(' Østerbrogade 79 ');

    expect(url).toContain('https://photon.komoot.io/api/?q=%C3%98sterbrogade%2079&');
    expect(url).toContain('bbox=8.0%2C54.5%2C15.3%2C57.8');
    expect(url).toContain('layer=house');
    expect(url).toContain('layer=city');
  });

  test('stednavne til Ronnie søges i alle lag (fx øen Fyn)', () => {
    expect(photonSearchUrl('Fyn', { kind: 'place' })).not.toContain('layer=');
  });

  test.each([
    [
      { street: 'Østerbrogade', housenumber: '79', postcode: '2100', city: 'København Ø' },
      'Østerbrogade 79, 2100 København Ø',
    ],
    [{ name: 'Vesterbrogade', street: undefined, postcode: '1800', city: 'Frederiksberg' }, 'Vesterbrogade, 1800 Frederiksberg'],
    [{ name: 'Skagen', postcode: '9990' }, '9990 Skagen'],
    [{ name: 'Fyn' }, 'Fyn'],
    [
      { name: 'Aarhus Universitet', street: 'Eugen Warmings Vej', postcode: '8000', city: 'Aarhus' },
      'Aarhus Universitet, Eugen Warmings Vej, 8000 Aarhus',
    ],
  ])('%o vises som "%s"', (properties, expected) => {
    expect(formatPhotonAddress(properties)).toBe(expected);
  });

  test('forslag uden for Danmark og dubletter sorteres fra', () => {
    const json = {
      features: [
        photonFeature(
          { street: 'Østerbrogade', housenumber: '79', postcode: '2100', city: 'København Ø' },
          [12.577202, 55.7041],
        ),
        photonFeature({ name: 'Fyn', city: 'Stångby', countrycode: 'SE' }, [13.18, 55.75]),
        photonFeature(
          { street: 'Østerbrogade', housenumber: '79', postcode: '2100', city: 'København Ø' },
          [12.5772, 55.7041],
        ),
        photonFeature({ name: 'Uden punkt' }, []),
      ],
    };

    expect(parsePhotonResults(json)).toEqual([
      {
        address: 'Østerbrogade 79, 2100 København Ø',
        location: { latitude: 55.7041, longitude: 12.577202 },
      },
    ]);
  });

  test('et tomt eller ødelagt svar giver ingen forslag', () => {
    expect(parsePhotonResults(null)).toEqual([]);
    expect(parsePhotonResults({ features: 'nej' })).toEqual([]);
  });
});

describe('Dataforsyningen (GSearch)', () => {
  test('URL med ressource, søgetekst og token', () => {
    expect(gsearchUrl('husnummer', 'Østerbrogade 79', 'abc')).toBe(
      'https://api.dataforsyningen.dk/rest/gsearch/v2.0/husnummer?q=%C3%98sterbrogade%2079&limit=6&token=abc',
    );
  });

  // Referencepunkter regnet med proj4 (EPSG:25832 → WGS84).
  test.each([
    ['Rådhuspladsen', 724351.93, 6175804.02, 55.6761, 12.5683],
    ['Skagen', 594367.72, 6399308.93, 57.726, 10.5845],
    ['Bornholm', 892166.47, 6123208.8, 55.1, 15.15],
    ['Vestkysten', 443147.29, 6150801.22, 55.5, 8.1],
  ])('UTM32 → grader: %s', (_name, easting, northing, latitude, longitude) => {
    const result = utm32ToWgs84(easting, northing);
    expect(result.latitude).toBeCloseTo(latitude, 5);
    expect(result.longitude).toBeCloseTo(longitude, 5);
  });

  test('en adresse er et punkt i UTM32', () => {
    const location = gsearchLocation({ type: 'Point', coordinates: [724351.93, 6175804.02] });
    expect(location.latitude).toBeCloseTo(55.6761, 5);
    expect(location.longitude).toBeCloseTo(12.5683, 5);
  });

  test('et stednavn som en flade giver midten af udstrækningen', () => {
    const square = [
      [
        [
          [580000, 6120000],
          [600000, 6120000],
          [600000, 6140000],
          [580000, 6140000],
        ],
      ],
    ];
    const location = gsearchLocation({ type: 'MultiPolygon', coordinates: square });
    const middle = utm32ToWgs84(590000, 6130000);
    expect(location).toEqual(middle);
  });

  test('koordinater i grader bruges direkte', () => {
    expect(gsearchLocation({ type: 'Point', coordinates: [10.5845, 57.726] })).toEqual({
      latitude: 57.726,
      longitude: 10.5845,
    });
  });

  test('rækker uden tekst eller geometri springes over', () => {
    const rows = [
      { visningstekst: 'Østerbrogade 79, 2100 København Ø', geometri: { type: 'Point', coordinates: [12.5772, 55.7041] } },
      { visningstekst: '', geometri: { type: 'Point', coordinates: [12, 55] } },
      { visningstekst: 'Uden geometri' },
    ];

    expect(parseGSearchResults(rows)).toEqual([
      {
        address: 'Østerbrogade 79, 2100 København Ø',
        location: { latitude: 55.7041, longitude: 12.5772 },
      },
    ]);
    expect(parseGSearchResults({ message: 'User not authorized' })).toEqual([]);
  });
});
