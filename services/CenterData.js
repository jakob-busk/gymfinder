import { useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';

import { rtdb } from '../database/firebase';
import { CENTER_DATA_PATHS, resolveCenterData } from '../data/centerData';
import { CENTERS, CHAINS } from '../data/const';

const SAMPLE_DATA = { chains: CHAINS, centers: CENTERS };
const NODES = Object.keys(CENTER_DATA_PATHS);

// Lytter på Kæder, Centre og Tilbud i Realtime Database og returnerer dem i Matchnings form.
// Ændres data (fx af nat-jobbet), opdateres appen med det samme.
// source er 'firebase' eller 'sample' (eksempeldata, når databasen ikke er sat op eller tom).
export function useCenterData() {
  const [database, setDatabase] = useState({});
  const [loading, setLoading] = useState(rtdb != null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rtdb) return undefined;

    // Hver rod-node har sin egen lytter, da roden selv ikke må læses (brugerdata ligger der).
    const loaded = new Set();
    const unsubscribes = NODES.map((node) =>
      onValue(
        ref(rtdb, CENTER_DATA_PATHS[node]),
        (snapshot) => {
          loaded.add(node);
          setDatabase((current) => ({ ...current, [node]: snapshot.val() }));
          if (loaded.size === NODES.length) setLoading(false);
        },
        (listenError) => {
          console.error('Hent centerdata fejlede:', listenError);
          setError(listenError);
          setLoading(false);
        },
      ),
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, []);

  const data = useMemo(
    () => resolveCenterData({ database: error ? null : database, sampleData: SAMPLE_DATA }),
    [database, error],
  );

  return { ...data, loading, error };
}
