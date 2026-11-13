import { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { resolveFilterSettings } from '../data/filterSettings';

// De sidste Filtre og den sidste sortering på Find gemmes på telefonen (AsyncStorage), så de
// huskes efter genstart. Formen er beskrevet i data/filterSettings.js.

const FILTER_SETTINGS_KEY = 'gymfinder:filterSettings';

// Det gemte ({ filters, sortBy }) eller null, hvis intet er gemt (eller det ikke kan læses).
export async function loadFilterSettings() {
  try {
    const json = await AsyncStorage.getItem(FILTER_SETTINGS_KEY);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Hent Filtre fejlede:', error);
    return null;
  }
}

export async function saveFilterSettings(settings) {
  await AsyncStorage.setItem(FILTER_SETTINGS_KEY, JSON.stringify(settings));
}

// Nulstil: sletter det gemte, så Filtrene igen følger Præferencerne.
export async function clearFilterSettings() {
  await AsyncStorage.removeItem(FILTER_SETTINGS_KEY);
}

// Filtre og sortering til en skærm. Indlæses igen, hver gang skærmen får fokus, så Find altid
// viser det, der lige er valgt på Filtre. Returnerer:
//   filters, sortBy, isCustom   se resolveFilterSettings
//   loading                     true, indtil det gemte er læst første gang
//   setFilters, setSortBy       ændrer og gemmer
//   reset                       tilbage til Præferencerne og standard-sorteringen
export function useFilterSettings(preferences) {
  const [stored, setStored] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadFilterSettings().then((settings) => {
        if (!active) return;
        setStored(settings);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const settings = useMemo(
    () => resolveFilterSettings(stored, preferences),
    [stored, preferences],
  );

  const persist = (next) => {
    setStored(next);
    saveFilterSettings(next).catch((error) => console.error('Gem Filtre fejlede:', error));
  };

  const setFilters = (filters) => persist({ filters, sortBy: settings.sortBy });

  // Kun sorteringen gemmes; urørte Filtre følger stadig Præferencerne.
  const setSortBy = (sortBy) => persist({ filters: stored?.filters ?? null, sortBy });

  const reset = () => {
    setStored(null);
    clearFilterSettings().catch((error) => console.error('Nulstil Filtre fejlede:', error));
  };

  return { ...settings, loading, setFilters, setSortBy, reset };
}
