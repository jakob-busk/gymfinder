import { useCallback, useEffect, useMemo, useState } from 'react';
import { ref, onValue, remove, set } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { rtdb } from '../database/firebase';
import { fromStoredCurrentMembershipAlert } from '../data/priceAlerts';

// Prisalarmer og push-token i databasen. Prisalarmen på Nuværende medlemskab gemmes under
// Users/<uid>/currentMembershipAlert og push-tokenet under Users/<uid>/pushToken, så nat-jobbet
// kan læse dem server-side. Prisalarmer på Favoritter ligger på Favoritten (services/Favorites.js).
// Formerne er beskrevet i data/priceAlerts.js. Som profil og Favoritter gemmes alarmen også i
// AsyncStorage, så den virker uden Firebase og offline. Alt, der rører expo-notifications,
// ligger i services/Notifications.js.

const localAlertKey = (uid) => `gymfinder:currentMembershipAlert:${uid ?? 'local'}`;
const alertPath = (uid) => `Users/${uid}/currentMembershipAlert`;
const pushTokenPath = (uid) => `Users/${uid}/pushToken`;

async function loadLocalAlert(uid) {
  const json = await AsyncStorage.getItem(localAlertKey(uid));
  return fromStoredCurrentMembershipAlert(json ? JSON.parse(json) : null);
}

async function saveLocalAlert(uid, alert) {
  if (alert) await AsyncStorage.setItem(localAlertKey(uid), JSON.stringify(alert));
  else await AsyncStorage.removeItem(localAlertKey(uid));
}

// Følger Prisalarmen på Nuværende medlemskab. onChange kaldes først med den lokale kopi og
// derefter ved hver ændring i databasen. Returnerer en funktion, der stopper lytningen.
export function subscribeCurrentMembershipAlert(uid, onChange) {
  let active = true;
  let heardFromDatabase = false;

  loadLocalAlert(uid)
    .then((local) => {
      if (active && !heardFromDatabase) onChange(local);
    })
    .catch((error) => {
      console.error('Hent Prisalarm fejlede:', error);
      if (active && !heardFromDatabase) onChange(null);
    });

  if (!rtdb || !uid) {
    return () => {
      active = false;
    };
  }

  const unsubscribe = onValue(
    ref(rtdb, alertPath(uid)),
    async (snapshot) => {
      const alert = fromStoredCurrentMembershipAlert(snapshot.val());
      heardFromDatabase = true;
      try {
        await saveLocalAlert(uid, alert);
      } catch (error) {
        console.error('Gem Prisalarm fejlede:', error);
      }
      if (active) onChange(alert);
    },
    (error) => console.error('Hent Prisalarm fejlede:', error),
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

// Gemmer Prisalarmen på Nuværende medlemskab, eller sletter den (null = slået fra).
export async function storeCurrentMembershipAlert(uid, alert) {
  await saveLocalAlert(uid, alert);
  if (!rtdb || !uid) return;
  if (alert) await set(ref(rtdb, alertPath(uid)), alert);
  else await remove(ref(rtdb, alertPath(uid)));
}

// Ved log ud: fjern alarmen fra telefonen, og fjern telefonens push-token fra kontoen, så den
// næste bruger af telefonen ikke får kontoens push. Alarmerne på kontoen røres ikke.
export async function clearLocalPriceAlerts(uid) {
  await AsyncStorage.multiRemove([localAlertKey(uid), localAlertKey(null)]);
  if (!rtdb || !uid) return;
  try {
    await remove(ref(rtdb, pushTokenPath(uid)));
  } catch (error) {
    console.error('Fjern push-token fejlede:', error);
  }
}

// Gemmer telefonens Expo push-token på brugeren, så nat-jobbet kan sende push. Uden Firebase
// kan det ikke gemmes (false); lokale beskeder virker stadig.
export async function savePushToken(uid, token, platform) {
  if (!rtdb || !uid) return false;
  await set(ref(rtdb, pushTokenPath(uid)), {
    expoPushToken: token,
    platform,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

// Prisalarmen på Nuværende medlemskab til hele appen (deles via UserContext). Returnerer:
//   currentMembershipAlert  alarmen eller null (slået fra)
//   loading                 true, indtil den er hentet
//   saveAlert               (alert | null) gemmer eller slår fra; afviser, hvis det fejler
export function useCurrentMembershipAlert({ authReady, uid }) {
  const [currentMembershipAlert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return undefined;
    setLoading(true);
    return subscribeCurrentMembershipAlert(uid, (alert) => {
      setAlert(alert);
      setLoading(false);
    });
  }, [authReady, uid]);

  const saveAlert = useCallback(
    async (alert) => {
      setAlert(alert);
      await storeCurrentMembershipAlert(uid, alert);
    },
    [uid],
  );

  return useMemo(
    () => ({ currentMembershipAlert, loading, saveAlert }),
    [currentMembershipAlert, loading, saveAlert],
  );
}
