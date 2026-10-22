import {
  RONNIE_LOOKUP_LIMIT,
  RONNIE_LOOKUP_RADIUS_KM,
  findCentersNearPlace,
  lookupToolContent,
  placeNameFromToolCall,
  ronnieLookupTool,
} from './ronnieLookup';

// Adfærdstests for Ronnies opslag af Centre andre steder i landet, uden netværk: geokoderen er
// falsk og kender kun de steder, der står herunder. Alle tal er regnet ud på forhånd.

const TODAY = '2026-10-22';
const HOME = { latitude: 55.6761, longitude: 12.5683 };
const HORNBAEK = { latitude: 56.09, longitude: 12.46 };
const PLACES = {
  'Hornbæk, Danmark': HORNBAEK,
  'Berlin, Danmark': { latitude: 52.52, longitude: 13.405 },
};

const fakeGeocode = jest.fn(async (address) => PLACES[address] ?? null);

const CHAIN = { id: 'kaede', name: 'Kæde', discounts: [] };

function center(id, location, overrides = {}) {
  return {
    id,
    chainId: 'kaede',
    name: `Kæde ${id}`,
    address: `${id}vej 1`,
    location,
    facilities: { sauna: true, groupClasses: null, open24h: null },
    machines: null,
    offers: [
      {
        id: `${id}-basis`,
        name: 'Basis',
        subscriptionType: 'Lokal center',
        standardPrice: 300,
        campaignPrice: null,
        campaignMonths: 0,
        signupFee: 0,
        adminFee: 0,
        bindingMonths: 0,
        partnerPrice: null,
      },
    ],
    ...overrides,
  };
}

// Hornbæk Nord ligger 0,01 breddegrad (1,1 km) nord for Hornbæk, Helsingør ca. 11 km væk.
const CENTERS = [
  center('kbh', HOME),
  center('helsingor', { latitude: 56.03, longitude: 12.61 }),
  center('hornbaek-nord', { latitude: 56.1, longitude: 12.46 }),
];
const USER = {
  birthDate: '1990-01-01',
  discountProfile: [],
  currentMembership: null,
  location: HOME,
};

function lookup(placeName, extra = {}) {
  return findCentersNearPlace({
    placeName,
    geocode: fakeGeocode,
    centers: CENTERS,
    chains: [CHAIN],
    user: USER,
    filters: {},
    today: TODAY,
    ...extra,
  });
}

beforeEach(() => fakeGeocode.mockClear());

describe('Opslag af Centre nær et stednavn', () => {
  test('giver de nærmeste Centre ved stedet, nærmeste først, med afstand fra stedet', async () => {
    const result = await lookup('Hornbæk');

    expect(result.status).toBe('found');
    expect(result.location).toEqual(HORNBAEK);
    expect(result.matches.map((match) => match.center.id)).toEqual([
      'hornbaek-nord',
      'helsingor',
    ]);
    expect(result.matches[0].distanceKm).toBeCloseTo(1.1, 1);
    // Ærlig årspris: 300 kr/md uden gebyrer.
    expect(result.matches[0].honestYearlyPrice).toBe(300);
  });

  test('Centre langt fra stedet er ikke med, heller ikke selvom de ligger tæt på brugeren', async () => {
    const ids = (await lookup('Hornbæk')).matches.map((match) => match.center.id);
    expect(RONNIE_LOOKUP_RADIUS_KM).toBe(25);
    expect(ids).not.toContain('kbh');
  });

  test('brugerens Filtre gælder, men maks. afstand fra egen adresse gør ikke', async () => {
    const centers = [
      ...CENTERS,
      center('uden-sauna', { latitude: 56.095, longitude: 12.46 }, { facilities: { sauna: false } }),
    ];
    const ids = (
      await lookup('Hornbæk', { centers, filters: { sauna: true, maxDistanceKm: 5 } })
    ).matches.map((match) => match.center.id);

    expect(ids).toEqual(['hornbaek-nord', 'helsingor']);
  });

  test('højst RONNIE_LOOKUP_LIMIT Centre', async () => {
    const centers = Array.from({ length: 15 }, (_, i) =>
      center(`c${i}`, { latitude: 56.09 + i * 0.001, longitude: 12.46 }),
    );
    const result = await lookup('Hornbæk', { centers });
    expect(result.matches).toHaveLength(RONNIE_LOOKUP_LIMIT);
  });

  test('stednavnet slås op i Danmark', async () => {
    await lookup('  Hornbæk ');
    expect(fakeGeocode).toHaveBeenCalledWith('Hornbæk, Danmark');
  });
});

describe('Ukendte steder håndteres pænt', () => {
  test('et sted, der ikke kan findes, giver unknownPlace uden Centre', async () => {
    const result = await lookup('Bjergbyhøjelund');
    expect(result).toMatchObject({ status: 'unknownPlace', placeName: 'Bjergbyhøjelund' });
    expect(result.matches).toEqual([]);
  });

  test('tomt stednavn slås ikke op', async () => {
    const result = await lookup('  ');
    expect(result.status).toBe('unknownPlace');
    expect(fakeGeocode).not.toHaveBeenCalled();
  });

  test('et sted uden for Danmark giver outsideDenmark', async () => {
    const result = await lookup('Berlin');
    expect(result.status).toBe('outsideDenmark');
    expect(result.matches).toEqual([]);
  });

  test('fejler geokoderen (fx ingen forbindelse), giver det lookupFailed', async () => {
    const failing = jest.fn(async () => {
      throw new Error('Network request failed');
    });
    const result = await lookup('Hornbæk', { geocode: failing });
    expect(result.status).toBe('lookupFailed');
  });
});

describe('Svaret til Ronnie', () => {
  test('fundne Centre med personlig Ærlig årspris og afstand fra stedet', async () => {
    const content = JSON.parse(lookupToolContent(await lookup('Hornbæk')));

    expect(content).toMatchObject({ sted: 'Hornbæk', status: 'found' });
    expect(content.besked).toMatch(/fra Hornbæk/);
    expect(content.centre[0]).toMatchObject({
      id: 'hornbaek-nord',
      afstandKm: 1.1,
      tilbud: [{ navn: 'Basis', aerligAarsprisKrPrMd: 300 }],
    });
  });

  test('ukendt sted giver en besked, Ronnie kan svare ud fra', async () => {
    const content = JSON.parse(lookupToolContent(await lookup('Bjergbyhøjelund')));
    expect(content.status).toBe('unknownPlace');
    expect(content.besked).toMatch(/kunne ikke findes/);
    expect(content.centre).toEqual([]);
  });

  test('ingen Centre i nærheden siges ærligt', async () => {
    const content = JSON.parse(lookupToolContent(await lookup('Hornbæk', { centers: [] })));
    expect(content.status).toBe('found');
    expect(content.besked).toMatch(/Ingen Centre inden for 25 km/);
  });
});

test('værktøjet hedder find_centre_naer_sted og tager et stednavn', () => {
  expect(ronnieLookupTool.function.name).toBe('find_centre_naer_sted');
  expect(ronnieLookupTool.function.parameters.required).toEqual(['stednavn']);
  expect(placeNameFromToolCall({ function: { arguments: '{"stednavn":"Hornbæk"}' } })).toBe(
    'Hornbæk',
  );
  expect(placeNameFromToolCall({ function: { arguments: 'ikke json' } })).toBe('');
});
