// PROTOTYPE — slettes, når en variant er valgt
// Plan: grupperer Matchningens Centre i ét kort pr. Kæde og lægger et mock-lag med fiktive ekstra
// faciliteter og Præferencer ovenpå, så varianterne i components/ChainResultsPrototype.js kan
// testes med 10+ faciliteter.

import { FACILITY_FILTERS, NOT_STATED_LABELS } from './matchning.js';

// Midlertidig regel: ligger flere Centre inden for 25 kr/md af det billigste, vinder det tætteste.
export const CLOSE_PRICE_KR = 25;

const distanceOf = (match) => match.distanceKm ?? Infinity;

// Bedste Center efter prototypereglen: lavest Ærlig årspris, men tættest blandt dem inden for
// CLOSE_PRICE_KR af det billigste.
function pickBest(matches) {
  const cheapest = Math.min(...matches.map((m) => m.honestYearlyPrice));
  const candidates = matches.filter((m) => m.honestYearlyPrice <= cheapest + CLOSE_PRICE_KR);
  return candidates.reduce((best, m) => {
    const d = distanceOf(m) - distanceOf(best);
    if (d < 0 || (d === 0 && m.honestYearlyPrice < best.honestYearlyPrice)) return m;
    return best;
  });
}

// Sorterer efter samme regel: tag det bedste, så det bedste af resten osv.
function sortByRule(matches) {
  const rest = [...matches];
  const sorted = [];
  while (rest.length > 0) {
    const best = pickBest(rest);
    sorted.push(best);
    rest.splice(rest.indexOf(best), 1);
  }
  return sorted;
}

const kr = (amount) => `${Math.round(amount)} kr`;

// Kort begrundelse for, hvorfor netop dette Center er Kædens bedste.
function reasonFor(best, all, chainName) {
  if (all.length === 1) return { kind: 'only', text: `Eneste matchende Center i ${chainName}` };
  const cheapest = all.reduce((a, b) => (b.honestYearlyPrice < a.honestYearlyPrice ? b : a));
  const closest = all.reduce((a, b) => (distanceOf(b) < distanceOf(a) ? b : a));
  if (cheapest === best) {
    return closest === best
      ? { kind: 'cheapestAndClosest', text: `Billigst og tættest i ${chainName}` }
      : { kind: 'cheapest', text: `Billigst i ${chainName}` };
  }
  const extra = best.honestYearlyPrice - cheapest.honestYearlyPrice;
  return {
    kind: 'closest',
    text: `Tættest på dig – kun ${kr(extra)}/md dyrere end ${cheapest.center.name}`,
  };
}

// [CenterMatch] → [{ chain, best, others, all, reason }] sorteret efter prototypereglen.
// Kort nr. 1 er ANBEFALET.
export function groupByChain(matches) {
  const byChain = new Map();
  for (const match of matches) {
    const key = match.chain?.id ?? match.center.chainId ?? 'ukendt';
    if (!byChain.has(key)) byChain.set(key, []);
    byChain.get(key).push(match);
  }

  const groups = [...byChain.values()].map((all) => {
    const sorted = sortByRule(all);
    const best = sorted[0];
    const chainName = best.chain?.name ?? 'Kæden';
    return {
      chain: best.chain ?? { id: best.center.chainId, name: chainName },
      best,
      others: sorted.slice(1),
      all: sorted,
      reason: reasonFor(best, all, chainName),
    };
  });

  const bestSorted = sortByRule(groups.map((group) => group.best));
  return bestSorted.map((best) => groups.find((group) => group.best === best));
}

// ---------- Mock-lag: fiktive ekstra faciliteter og Præferencer ----------

export const MOCK_FACILITIES = [
  { key: 'pool', label: 'Svømmehal', icon: 'water-outline' },
  { key: 'spinning', label: 'Spinning', icon: 'bicycle-outline' },
  { key: 'crossfit', label: 'Crossfit-område', icon: 'barbell-outline' },
  { key: 'parking', label: 'Parkering', icon: 'car-outline' },
  { key: 'childcare', label: 'Børnepasning', icon: 'happy-outline' },
  { key: 'physio', label: 'Fysioterapeut', icon: 'medkit-outline' },
  { key: 'manyMachines', label: 'Mange maskiner', icon: 'fitness-outline' },
  { key: 'yoga', label: 'Yogasal', icon: 'leaf-outline' },
  { key: 'boxing', label: 'Boksering', icon: 'hand-left-outline' },
  { key: 'towels', label: 'Håndklæder inkl.', icon: 'shirt-outline' },
  { key: 'bodyScan', label: 'Kropsscanning', icon: 'scan-outline' },
];

const REAL_ICONS = { sauna: 'flame-outline', groupClasses: 'people-outline', open24h: 'time-outline' };

// Fiktive ekstra ønsker. 'few' = som en typisk bruger, 'many' = presser layoutet.
export const MOCK_WISHES = {
  off: [],
  few: ['pool', 'parking'],
  many: ['pool', 'parking', 'spinning', 'physio', 'childcare', 'yoga', 'manyMachines', 'towels'],
};

// Lille deterministisk hash, så de fiktive faciliteter er de samme ved hver genindlæsning.
function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h;
}

// true (ca. 50 %), false (ca. 35 %) eller null = "Ikke oplyst" (ca. 15 %).
function mockValue(centerId, key) {
  const n = hash(`${centerId}:${key}`) % 100;
  if (n < 50) return true;
  if (n < 85) return false;
  return null;
}

// Brugerens ønsker: de rigtige (aktive facilitets-Filtre og maskiner) + evt. fiktive.
export function wishesFor(filters, mockLevel) {
  const real = FACILITY_FILTERS.filter((key) => filters?.[key] === true);
  const machines = (filters?.machines ?? []).map((machine) => `machine:${machine}`);
  return [...real, ...machines, ...(MOCK_WISHES[mockLevel] ?? [])];
}

export const isMockKey = (key) => MOCK_FACILITIES.some((f) => f.key === key);

export function wishLabel(key) {
  if (key.startsWith('machine:')) return key.slice('machine:'.length);
  return NOT_STATED_LABELS[key] ?? MOCK_FACILITIES.find((f) => f.key === key)?.label ?? key;
}

// Alle faciliteter for et Center som
// [{ key, label, icon, value: true|false|null, wanted, mock }], sorteret så det vigtigste står
// først: ønsket og opfyldt, ønsket men ukendt, ønsket men mangler, derefter resten.
export function facilitiesFor(center, wishes, { withMock }) {
  const wanted = new Set(wishes);
  const items = FACILITY_FILTERS.map((key) => ({
    key,
    label: NOT_STATED_LABELS[key],
    icon: REAL_ICONS[key],
    value: center.facilities?.[key] ?? null,
    mock: false,
  }));

  for (const key of wishes.filter((w) => w.startsWith('machine:'))) {
    const machine = key.slice('machine:'.length);
    items.push({
      key,
      label: machine,
      icon: 'barbell-outline',
      value: center.machines == null ? null : center.machines.includes(machine),
      mock: false,
    });
  }

  if (withMock) {
    for (const facility of MOCK_FACILITIES) {
      items.push({ ...facility, value: mockValue(center.id, facility.key), mock: true });
    }
  }

  const rank = (item) => {
    if (item.wanted) return item.value === true ? 0 : item.value == null ? 1 : 2;
    return item.value === true ? 3 : item.value == null ? 4 : 5;
  };
  return items
    .map((item) => ({ ...item, wanted: wanted.has(item.key) }))
    .sort((a, b) => rank(a) - rank(b));
}

// "3 af 5 ønsker opfyldt": { met, unknown, missing, total }.
export function wishSummary(facilities) {
  const wanted = facilities.filter((f) => f.wanted);
  return {
    total: wanted.length,
    met: wanted.filter((f) => f.value === true).length,
    unknown: wanted.filter((f) => f.value == null).length,
    missing: wanted.filter((f) => f.value === false).length,
  };
}
