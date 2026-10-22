import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ref, onValue, remove, set, update } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { rtdb } from '../database/firebase';
import {
  addFavorite,
  fromStoredFavorites,
  newFavorite,
  removeFavorite,
} from '../data/favorites';
import { setFavoritePriceAlert } from '../data/priceAlerts';

// Favoritter gemmes i Realtime Database under Users/<uid>/favorites/<centerId>, så de følger
// brugeren (også efter "Gem din profil" og log ind på en ny telefon). En kopi gemmes altid i
// AsyncStorage, så appen også virker uden Firebase-nøgler og offline, ligesom profilen.
// Formen er beskrevet i data/favorites.js.

const localFavoritesKey = (uid) => `gymfinder:favorites:${uid ?? 'local'}`;
const favoritesPath = (uid) => `Users/${uid}/favorites`;

async function loadLocalFavorites(uid) {
  const json = await AsyncStorage.getItem(localFavoritesKey(uid));
  return fromStoredFavorites(json ? JSON.parse(json) : null);
}

async function saveLocalFavorites(uid, favorites) {
  await AsyncStorage.setItem(localFavoritesKey(uid), JSON.stringify(favorites));
}

// Favoritter gemt uden login (uden Firebase eller offline ved første opstart) lægges op på
// brugeren, når der er en uid, og databasen ikke har nogen. Den lokale kopi slettes bagefter,
// så de ikke kommer igen, hvis brugeren senere fjerner dem alle. true, hvis der blev lagt op.
async function uploadFavoritesSavedWithoutLogin(uid) {
  const local = await loadLocalFavorites(null);
  if (Object.keys(local).length === 0) return false;
  await update(ref(rtdb, favoritesPath(uid)), local);
  await AsyncStorage.removeItem(localFavoritesKey(null));
  return true;
}

// Følger brugerens Favoritter. onChange kaldes først med den lokale kopi og derefter, hver gang
// de ændres i databasen (også fra en anden telefon). Uden Firebase eller uid bruges kun den
// lokale kopi. Returnerer en funktion, der stopper lytningen.
export function subscribeFavorites(uid, onChange) {
  let active = true;
  let heardFromDatabase = false;

  loadLocalFavorites(uid)
    .then((local) => {
      if (active && !heardFromDatabase) onChange(local);
    })
    .catch((error) => {
      console.error('Hent Favoritter fejlede:', error);
      if (active && !heardFromDatabase) onChange({});
    });

  if (!rtdb || !uid) {
    return () => {
      active = false;
    };
  }

  const handleSnapshot = async (snapshot) => {
    const favorites = fromStoredFavorites(snapshot.val());
    try {
      if (Object.keys(favorites).length === 0 && (await uploadFavoritesSavedWithoutLogin(uid))) {
        return;
      }
      await saveLocalFavorites(uid, favorites);
    } catch (error) {
      console.error('Gem Favoritter fejlede:', error);
    }
    heardFromDatabase = true;
    if (active) onChange(favorites);
  };

  const unsubscribe = onValue(ref(rtdb, favoritesPath(uid)), handleSnapshot, (error) =>
    console.error('Hent Favoritter fejlede:', error),
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

// Gemmer ændringen af ét Center. favorites er alle Favoritter efter ændringen: er centerId med,
// skrives den Favorit; ellers slettes den. Kun den ene sti i databasen røres.
export async function storeFavorite(uid, favorites, centerId) {
  await saveLocalFavorites(uid, favorites);
  if (!rtdb || !uid) return;
  const path = `${favoritesPath(uid)}/${centerId}`;
  const favorite = favorites[centerId];
  if (favorite) await set(ref(rtdb, path), favorite);
  else await remove(ref(rtdb, path));
}

// Ved log ud: fjern Favoritterne fra telefonen. Favoritterne på kontoen røres ikke.
export async function clearLocalFavorites(uid) {
  await AsyncStorage.multiRemove([localFavoritesKey(uid), localFavoritesKey(null)]);
}

// Brugerens Favoritter til hele appen (deles via UserContext). Venter på login (authReady), så
// Favoritterne hentes for den rigtige uid. Returnerer:
//   favorites        { [centerId]: Favorit } (se data/favorites.js)
//   loading          true, indtil Favoritterne er hentet
//   isFavorite       (centerId) => true/false
//   toggleFavorite   (centerId, honestYearlyPrice) gør Centret til Favorit eller fjerner det
//   removeFavorite   (centerId)
//   setPriceAlert    (centerId, { thresholdPerMonth } | null, honestYearlyPrice) slår
//                    Prisalarmen til (målt fra prisen lige nu) eller fra (se data/priceAlerts.js)
//   updateFavorite   (centerId, favorite) erstatter én Favorit, fx efter en Prisalarm-besked
// Ændringer vises med det samme; ændringerne afviser, hvis de ikke kunne gemmes.
export function useFavorites({ authReady, uid }) {
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  // Den seneste værdi, så to hurtige tryk bygger videre på hinanden.
  const latest = useRef(favorites);

  useEffect(() => {
    if (!authReady) return undefined;
    setLoading(true);
    return subscribeFavorites(uid, (next) => {
      latest.current = next;
      setFavorites(next);
      setLoading(false);
    });
  }, [authReady, uid]);

  const change = useCallback(
    async (centerId, next) => {
      latest.current = next;
      setFavorites(next);
      await storeFavorite(uid, next, centerId);
    },
    [uid],
  );

  const toggleFavorite = useCallback(
    (centerId, honestYearlyPrice) => {
      const current = latest.current;
      const next = current[centerId]
        ? removeFavorite(current, centerId)
        : addFavorite(current, centerId, newFavorite({ honestYearlyPrice }));
      return change(centerId, next);
    },
    [change],
  );

  const handleRemove = useCallback(
    (centerId) => change(centerId, removeFavorite(latest.current, centerId)),
    [change],
  );

  const setPriceAlert = useCallback(
    (centerId, priceAlert, honestYearlyPrice) =>
      change(
        centerId,
        setFavoritePriceAlert(latest.current, centerId, priceAlert, honestYearlyPrice),
      ),
    [change],
  );

  const updateFavorite = useCallback(
    async (centerId, favorite) => {
      if (!latest.current[centerId]) return;
      await change(centerId, { ...latest.current, [centerId]: favorite });
    },
    [change],
  );

  const isFavorite = useCallback((centerId) => Boolean(favorites[centerId]), [favorites]);

  return useMemo(
    () => ({
      favorites,
      loading,
      isFavorite,
      toggleFavorite,
      removeFavorite: handleRemove,
      setPriceAlert,
      updateFavorite,
    }),
    [favorites, loading, isFavorite, toggleFavorite, handleRemove, setPriceAlert, updateFavorite],
  );
}
