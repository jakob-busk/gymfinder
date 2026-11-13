import { useCallback, useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';

import { rtdb } from '../database/firebase';
import { CENTER_DATA_PATHS, resolveCenterData } from '../data/centerData';
import { CENTERS, CHAINS } from '../data/const';

const SAMPLE_DATA = { chains: CHAINS, centers: CENTERS };
const NODES = Object.keys(CENTER_DATA_PATHS);

// Uden net kalder Firebase aldrig tilbage, så skærmene ville vente for evigt. Efter så lang tid
// gives op, og skærmene viser "Ingen forbindelse" med "Prøv igen".
export const LOAD_TIMEOUT_MS = 8000;

// Lytter på Kæder, Centre og Tilbud i Realtime Database og returnerer dem i Matchnings form.
// Ændres data (fx af nat-jobbet), opdateres appen med det samme.
// source er 'firebase' eller 'sample' (eksempeldata, når databasen ikke er sat op eller tom).
// offline er true, når data ikke kom inden LOAD_TIMEOUT_MS (typisk ingen forbindelse); retry()
// prøver igen. Kommer data senere alligevel, forsvinder offline af sig selv.
export function useCenterData() {
  const [database, setDatabase] = useState({});
  const [loading, setLoading] = useState(rtdb != null);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!rtdb) return undefined;
    setLoading(true);
    setOffline(false);
    setError(null);

    // Hver rod-node har sin egen lytter, da roden selv ikke må læses (brugerdata ligger der).
    const loaded = new Set();
    const timer = setTimeout(() => {
      if (loaded.size < NODES.length) {
        setOffline(true);
        setLoading(false);
      }
    }, LOAD_TIMEOUT_MS);

    const unsubscribes = NODES.map((node) =>
      onValue(
        ref(rtdb, CENTER_DATA_PATHS[node]),
        (snapshot) => {
          loaded.add(node);
          setDatabase((current) => ({ ...current, [node]: snapshot.val() }));
          if (loaded.size === NODES.length) {
            clearTimeout(timer);
            setOffline(false);
            setLoading(false);
          }
        },
        (listenError) => {
          console.error('Hent centerdata fejlede:', listenError);
          clearTimeout(timer);
          setError(listenError);
          setLoading(false);
        },
      ),
    );

    return () => {
      clearTimeout(timer);
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  const data = useMemo(
    () => resolveCenterData({ database: error ? null : database, sampleData: SAMPLE_DATA }),
    [database, error],
  );

  return { ...data, loading, error, offline, retry };
}
