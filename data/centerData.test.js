import { buildSeedUpdate, fromDatabase, resolveCenterData } from './centerData';
import { CENTERS, CHAINS } from './const';
import { matchCenters } from './matchning';

// Efterligner hvad Realtime Database gemmer: null, undefined, tomme lister og tomme objekter
// forsvinder helt.
function storedInDatabase(value) {
  if (Array.isArray(value)) {
    const items = value.map(storedInDatabase).filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, child]) => [key, storedInDatabase(child)])
      .filter(([, child]) => child !== undefined);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  return value ?? undefined;
}

// Lægger en multi-path-opdatering ind i et træ, som Realtime Database gør: hver sti overskrives.
function applyUpdate(tree, update) {
  const next = JSON.parse(JSON.stringify(tree));
  for (const [path, value] of Object.entries(update)) {
    const keys = path.split('/');
    const last = keys.pop();
    let node = next;
    for (const key of keys) {
      node[key] = node[key] ?? {};
      node = node[key];
    }
    node[last] = value;
  }
  return storedInDatabase(next) ?? {};
}

const SAMPLE_DATA = { chains: CHAINS, centers: CENTERS };

// Læser Kæder, Centre og Tilbud ud af et databasetræ, som appen gør.
const readCenterData = (tree) =>
  fromDatabase({ chains: tree.Chains, centers: tree.Centers, offers: tree.Offers });

const byId = (items) => Object.fromEntries(items.map((item) => [item.id, item]));

describe('seed af centerdata', () => {
  test('de håndindtastede data kommer uændret tilbage fra databasen', () => {
    const tree = applyUpdate({}, buildSeedUpdate(SAMPLE_DATA));
    const { chains, centers } = readCenterData(tree);

    expect(byId(chains)).toEqual(byId(CHAINS));
    expect(Object.keys(byId(centers)).sort()).toEqual(CENTERS.map((c) => c.id).sort());
    for (const center of CENTERS) {
      const read = byId(centers)[center.id];
      expect({ ...read, offers: byId(read.offers) }).toEqual({
        ...center,
        offers: byId(center.offers),
      });
    }
  });

  test('ukendte værdier (null) overlever, selvom databasen ikke gemmer null', () => {
    const tree = applyUpdate({}, buildSeedUpdate(SAMPLE_DATA));
    const centers = byId(readCenterData(tree).centers);

    expect(centers['fitnessx-lyngby'].machines).toBeNull();
    expect(centers['fitnessx-lyngby'].facilities.open24h).toBeNull();
    expect(byId(centers['sats-frederiksberg'].offers)['sats-frederiksberg-base'].bindingMonths)
      .toBeNull();
    expect(byId(readCenterData(tree).chains).fitnessx.discounts).toEqual([]);
  });

  test('seed kan køres flere gange med samme resultat', () => {
    const once = applyUpdate({}, buildSeedUpdate(SAMPLE_DATA));
    const twice = applyUpdate(once, buildSeedUpdate(SAMPLE_DATA));

    expect(twice).toEqual(once);
  });

  test('seed overskriver ændrede priser i seedede Centre og lader brugerdata være', () => {
    const before = applyUpdate({}, buildSeedUpdate(SAMPLE_DATA));
    before.Offers['sats-oesterbro']['sats-oesterbro-base'].standardPrice = 1;
    before.Users = { abc: { favorites: { 'sats-oesterbro': true } } };

    const after = applyUpdate(before, buildSeedUpdate(SAMPLE_DATA));

    expect(after.Offers['sats-oesterbro']['sats-oesterbro-base'].standardPrice).toBe(399);
    expect(after.Users).toEqual({ abc: { favorites: { 'sats-oesterbro': true } } });
  });

  test('Matchning giver samme resultat på data fra databasen som på eksempeldata', () => {
    const tree = applyUpdate({}, buildSeedUpdate(SAMPLE_DATA));
    const fromDb = readCenterData(tree);
    const input = {
      user: {
        birthDate: '1997-03-12',
        discountProfile: ['student'],
        currentMembership: { monthlyPrice: 299, chainId: null },
      },
      filters: { maxDistanceKm: 50 },
      sortBy: 'honestYearlyPrice',
      location: { latitude: 55.7088, longitude: 12.5725 },
      today: new Date('2026-10-22'),
    };

    const expected = matchCenters({ ...input, ...SAMPLE_DATA });
    const actual = matchCenters({ ...input, ...fromDb });

    expect(actual.recommendedId).toBe(expected.recommendedId);
    expect(actual.centers.map((m) => [m.center.id, m.honestYearlyPrice])).toEqual(
      expected.centers.map((m) => [m.center.id, m.honestYearlyPrice]),
    );
  });
});

describe('læsning af centerdata', () => {
  test('Centre uden kendt Kæde eller uden placering springes over', () => {
    const { centers } = fromDatabase({
      chains: { sats: { name: 'SATS' } },
      centers: {
        'sats-a': { chainId: 'sats', name: 'A', location: { latitude: 55.7, longitude: 12.5 } },
        'sats-b': { chainId: 'sats', name: 'B' },
        'ukendt-c': { chainId: 'ukendt', name: 'C', location: { latitude: 55, longitude: 12 } },
      },
      offers: {},
    });

    expect(centers.map((center) => center.id)).toEqual(['sats-a']);
    expect(centers[0].offers).toEqual([]);
  });

  test('Rabatter slettet i konsollen giver ikke huller i listen', () => {
    const { chains } = fromDatabase({
      chains: {
        sats: { name: 'SATS', discounts: [null, { discountGroup: 'student', percentOff: 20 }] },
      },
    });

    expect(chains[0].discounts).toEqual([{ discountGroup: 'student', percentOff: 20 }]);
  });
});

describe('valg af datakilde', () => {
  test('bruger databasen, når den har Centre', () => {
    const database = applyUpdate({}, buildSeedUpdate(SAMPLE_DATA));
    const result = resolveCenterData({
      database: { chains: database.Chains, centers: database.Centers, offers: database.Offers },
      sampleData: SAMPLE_DATA,
    });

    expect(result.source).toBe('firebase');
    expect(result.centers).toHaveLength(CENTERS.length);
  });

  test('falder tilbage på eksempeldata, når databasen er tom eller ikke sat op', () => {
    const empty = resolveCenterData({
      database: { chains: null, centers: null, offers: null },
      sampleData: SAMPLE_DATA,
    });
    const missing = resolveCenterData({ database: null, sampleData: SAMPLE_DATA });

    expect(empty).toEqual({ chains: CHAINS, centers: CENTERS, source: 'sample' });
    expect(missing).toEqual({ chains: CHAINS, centers: CENTERS, source: 'sample' });
  });
});
