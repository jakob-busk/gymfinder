// Filtre og sortering på Find: hvilke Filtre og hvilken sortering der gælder, ud fra det, der er
// gemt på telefonen, og brugerens Præferencer. Ren JavaScript uden React Native eller Expo, så
// den kan testes direkte.
//
// Gemt form (AsyncStorage): { filters: Filtre | null, sortBy: string | null }.
// filters = null betyder, at brugeren ikke har rettet Filtrene, så de følger Præferencerne
// (også når Præferencerne ændres på Profil). Nulstil sletter det gemte.

import { SORT_OPTIONS } from './matchning.js';
import { EMPTY_PREFERENCES } from './userProfile.js';

export const DEFAULT_SORT = 'honestYearlyPrice';

const TOGGLE_KEYS = ['sauna', 'groupClasses', 'open24h', 'multiCenterAccess', 'noBinding'];

// Et komplet Filter-objekt i samme form som Præferencer (og som Matchning forventer).
function normalizeFilters(value) {
  const filters = { ...EMPTY_PREFERENCES, ...value };
  const machines = Array.isArray(filters.machines) ? filters.machines : [];
  const maxDistanceKm = Number(filters.maxDistanceKm) > 0 ? Number(filters.maxDistanceKm) : null;
  return {
    ...filters,
    ...Object.fromEntries(TOGGLE_KEYS.map((key) => [key, filters[key] === true])),
    machines,
    maxDistanceKm: maxDistanceKm ?? EMPTY_PREFERENCES.maxDistanceKm,
  };
}

function isValidSort(sortBy) {
  return SORT_OPTIONS.some((option) => option.id === sortBy);
}

// Gemt indstilling + Præferencer → { filters, sortBy, isCustom }.
// isCustom = brugeren har rettet Filtrene, så de ikke længere følger Præferencerne.
export function resolveFilterSettings(stored, preferences) {
  const saved = stored && typeof stored === 'object' ? stored : {};
  const hasCustomFilters = saved.filters != null && typeof saved.filters === 'object';
  return {
    filters: normalizeFilters(hasCustomFilters ? saved.filters : preferences),
    sortBy: isValidSort(saved.sortBy) ? saved.sortBy : DEFAULT_SORT,
    isCustom: hasCustomFilters,
  };
}

// Antal aktive Filtre ud over maks. afstand (som altid er sat). Vises på Filtre-knappen.
export function activeFilterCount(filters) {
  const active = filters ?? {};
  const toggles = TOGGLE_KEYS.filter((key) => active[key] === true).length;
  return toggles + (active.machines ?? []).length;
}
