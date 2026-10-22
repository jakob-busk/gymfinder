import {
  addFavorite,
  favoritePrice,
  favoriteRows,
  fromStoredFavorites,
  newFavorite,
  removeFavorite,
  toStoredFavorite,
  toStoredFavorites,
} from './favorites';

// Adfærdstests for Favoritter: hvilken pris der følges, rækkerne på Favoritter-skærmen og
// formen i databasen. Alle tal er regnet ud på forhånd.

const TODAY = '2026-10-22';
const USER = { birthDate: '1990-01-01', discountProfile: [], currentMembership: null };

const CHAIN = {
  id: 'kaede',
  name: 'Kæde',
  discounts: [{ discountGroup: 'student', percentOff: 50 }],
};

function offer(overrides = {}) {
  return {
    id: 'basis',
    name: 'Basis',
    subscriptionType: 'Lokal center',
    standardPrice: 300,
    campaignPrice: null,
    campaignMonths: 0,
    signupFee: 0,
    adminFee: 0,
    bindingMonths: 0,
    partnerPrice: null,
    ...overrides,
  };
}

function center(id, offers) {
  return {
    id,
    chainId: 'kaede',
    name: `Kæde ${id}`,
    address: 'Gaden 1, 1000 København',
    location: { latitude: 55.6761, longitude: 12.5683 },
    facilities: {},
    machines: null,
    offers,
  };
}

describe('favoritePrice', () => {
  test('følger den laveste Ærlig årspris blandt Centrets Tilbud', () => {
    const gym = center('a', [
      offer({ id: 'dyr', standardPrice: 400 }),
      // 199 kr i oprettelse + 12 × 250 kr = 3.199 kr / 12
      offer({ id: 'billig', standardPrice: 250, signupFee: 199 }),
    ]);

    const price = favoritePrice({ center: gym, chains: [CHAIN], user: USER, today: TODAY });

    expect(price).toBeCloseTo(3199 / 12);
  });

  test('regner med brugerens Rabatter', () => {
    const gym = center('a', [offer({ standardPrice: 300 })]);
    const student = { ...USER, discountProfile: ['student'] };

    expect(favoritePrice({ center: gym, chains: [CHAIN], user: student, today: TODAY })).toBe(150);
  });

  test('Filtre spiller ingen rolle: også Tilbud med Binding tæller', () => {
    const gym = center('a', [offer({ standardPrice: 200, bindingMonths: 12 })]);

    expect(favoritePrice({ center: gym, chains: [CHAIN], user: USER, today: TODAY })).toBe(200);
  });

  test('er null for et Center, der ikke findes eller ikke har Tilbud', () => {
    expect(favoritePrice({ center: null, chains: [CHAIN], user: USER, today: TODAY })).toBeNull();
    expect(
      favoritePrice({ center: center('a', []), chains: [CHAIN], user: USER, today: TODAY }),
    ).toBeNull();
  });
});

describe('tilføj og fjern', () => {
  test('en ny Favorit husker prisen og tidspunktet og har ingen Prisalarm', () => {
    const favorite = newFavorite({
      honestYearlyPrice: 249,
      now: new Date('2026-10-22T10:00:00.000Z'),
    });

    expect(favorite).toEqual({
      addedAt: '2026-10-22T10:00:00.000Z',
      honestYearlyPrice: 249,
      priceAlert: null,
    });
  });

  test('tilføj og fjern ændrer kun det ene Center', () => {
    const one = addFavorite({}, 'a', newFavorite({ honestYearlyPrice: 200 }));
    const two = addFavorite(one, 'b', newFavorite({ honestYearlyPrice: 300 }));

    expect(Object.keys(two)).toEqual(['a', 'b']);
    expect(removeFavorite(two, 'a')).toEqual({ b: two.b });
    expect(one).not.toHaveProperty('b');
  });
});

describe('fromStoredFavorites', () => {
  test('intet gemt giver ingen Favoritter', () => {
    expect(fromStoredFavorites(null)).toEqual({});
  });

  test('manglende felter (databasen gemmer ikke null) får standardværdier', () => {
    const favorites = fromStoredFavorites({ a: { addedAt: '2026-10-22T10:00:00.000Z' } });

    expect(favorites).toEqual({
      a: { addedAt: '2026-10-22T10:00:00.000Z', honestYearlyPrice: null, priceAlert: null },
    });
  });

  test('en Prisalarm med og uden tærskel bevares', () => {
    const favorites = fromStoredFavorites({
      a: { addedAt: 'x', honestYearlyPrice: 249, priceAlert: { thresholdPerMonth: 50 } },
      b: { addedAt: 'x', honestYearlyPrice: 249, priceAlert: {} },
    });

    expect(favorites.a.priceAlert).toEqual({ thresholdPerMonth: 50 });
    expect(favorites.b.priceAlert).toEqual({ thresholdPerMonth: null });
  });

  test('ugyldige værdier springes over', () => {
    expect(fromStoredFavorites({ a: true, b: 'x' })).toEqual({});
  });
});

// Som Realtime Database: null og tomme objekter gemmes ikke.
function throughDatabase(value) {
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value)
    .map(([key, child]) => [key, throughDatabase(child)])
    .filter(([, child]) => child != null);
  return entries.length === 0 ? null : Object.fromEntries(entries);
}

describe('toStoredFavorite', () => {
  test('en Prisalarm uden tærskel overlever databasen og er stadig slået til', () => {
    const favorite = {
      addedAt: 'x',
      honestYearlyPrice: 249,
      priceAlert: { thresholdPerMonth: null },
    };
    const stored = toStoredFavorite(favorite);

    expect(stored.priceAlert).toEqual({ thresholdPerMonth: 0 });
    expect(fromStoredFavorites({ a: throughDatabase(stored) }).a).toEqual(favorite);
  });

  test('tærskel og ingen Prisalarm gemmes uændret', () => {
    const favorites = {
      a: { addedAt: 'x', honestYearlyPrice: 249, priceAlert: { thresholdPerMonth: 50 } },
      b: { addedAt: 'x', honestYearlyPrice: null, priceAlert: null },
    };

    expect(toStoredFavorites(favorites)).toEqual(favorites);
    expect(fromStoredFavorites(throughDatabase(toStoredFavorites(favorites)))).toEqual(favorites);
  });
});

describe('favoriteRows', () => {
  const centers = [
    center('dyr', [offer({ standardPrice: 400 })]),
    center('billig', [offer({ standardPrice: 200 })]),
    center('tom', []),
  ];

  test('viser aktuel pris pr. Favorit, billigste først, og ændringen siden den blev gemt', () => {
    const favorites = {
      dyr: newFavorite({ honestYearlyPrice: 400 }),
      billig: newFavorite({ honestYearlyPrice: 250 }),
    };

    const rows = favoriteRows({ favorites, centers, chains: [CHAIN], user: USER, today: TODAY });

    expect(rows.map((row) => row.centerId)).toEqual(['billig', 'dyr']);
    expect(rows[0]).toMatchObject({ honestYearlyPrice: 200, priceChange: -50 });
    expect(rows[0].center.name).toBe('Kæde billig');
    expect(rows[0].chain.name).toBe('Kæde');
    expect(rows[1]).toMatchObject({ honestYearlyPrice: 400, priceChange: 0 });
  });

  test('Centre uden Tilbud eller som ikke findes længere står sidst uden pris', () => {
    const favorites = {
      vaek: newFavorite({ honestYearlyPrice: 300 }),
      tom: newFavorite(),
      dyr: newFavorite(),
    };

    const rows = favoriteRows({ favorites, centers, chains: [CHAIN], user: USER, today: TODAY });

    expect(rows[0]).toMatchObject({ centerId: 'dyr', honestYearlyPrice: 400, priceChange: null });
    expect(rows.slice(1).map((row) => row.honestYearlyPrice)).toEqual([null, null]);
    expect(rows.find((row) => row.centerId === 'vaek').center).toBeNull();
    expect(rows.find((row) => row.centerId === 'tom').match).toBeNull();
  });
});
