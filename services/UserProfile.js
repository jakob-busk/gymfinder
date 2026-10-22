import { useCallback, useEffect, useRef, useState } from 'react';
import { ref, get, set } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { rtdb } from '../database/firebase';
import { EMPTY_PROFILE, fromStoredProfile, needsOnboarding, toStoredProfile } from '../data/userProfile';

// Profilen gemmes i Realtime Database under Users/<uid>/profile, så den følger brugeren.
// En kopi gemmes altid i AsyncStorage, så appen også virker uden Firebase-nøgler og offline.
// Onboarding-status caches kun i AsyncStorage, så onboarding ikke vises igen på telefonen.

const ONBOARDING_DONE_KEY = 'gymfinder:onboardingDone';
const localProfileKey = (uid) => `gymfinder:profile:${uid ?? 'local'}`;
const profilePath = (uid) => `Users/${uid}/profile`;

// Gem først, når brugeren holder en pause i at skrive, så hvert tastetryk ikke bliver en skrivning.
const SAVE_DELAY_MS = 600;
// Uden forbindelse kan et opslag i databasen hænge; så bruges den lokale kopi.
const LOAD_TIMEOUT_MS = 5000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Ingen forbindelse til databasen')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function loadLocalProfile(uid) {
  const json = await AsyncStorage.getItem(localProfileKey(uid));
  return json ? fromStoredProfile(JSON.parse(json)) : null;
}

// Henter brugerens profil. Databasen vinder, når den har en profil; ellers bruges den lokale
// kopi. Er profilen gemt, før der var login (uden Firebase eller offline ved første opstart),
// bruges den. null, hvis brugeren ikke har gemt noget endnu.
export async function loadUserProfile(uid) {
  if (rtdb && uid) {
    try {
      const snapshot = await withTimeout(get(ref(rtdb, profilePath(uid))), LOAD_TIMEOUT_MS);
      const profile = fromStoredProfile(snapshot.val());
      if (profile) return profile;
    } catch (error) {
      console.error('Hent profil fejlede:', error);
    }
  }
  const local = await loadLocalProfile(uid);
  if (local || !uid) return local;
  return loadLocalProfile(null);
}

// Gemmer profilen lokalt og, hvis Firebase er sat op, i databasen.
export async function saveUserProfile(uid, profile) {
  const stored = toStoredProfile(profile);
  await AsyncStorage.setItem(localProfileKey(uid), JSON.stringify(stored));
  if (rtdb && uid) await set(ref(rtdb, profilePath(uid)), stored);
}

export async function loadOnboardingDone() {
  return (await AsyncStorage.getItem(ONBOARDING_DONE_KEY)) === 'true';
}

export async function saveOnboardingDone() {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
}

// Brugerens profil til hele appen. Venter på login (authReady), henter profilen for uid og
// gemmer ændringer automatisk. Returnerer:
//   user               profilen (samme form som brugeren i Matchning)
//   setUser            ændrer profilen (som useState); ændringen gemmes efter en kort pause
//   loading            true, indtil profilen er hentet
//   showOnboarding     true, indtil onboarding er gennemført
//   completeOnboarding afslutter onboarding som anonym og gemmer med det samme
export function useUserProfile({ authReady, uid }) {
  const [user, setProfile] = useState(EMPTY_PROFILE);
  const [cachedDone, setCachedDone] = useState(false);
  const [loading, setLoading] = useState(true);
  // Kun ændringer fra brugeren gemmes, ikke den profil, der lige er hentet.
  const changed = useRef(false);

  useEffect(() => {
    if (!authReady) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [profile, done] = await Promise.all([loadUserProfile(uid), loadOnboardingDone()]);
        if (cancelled) return;
        changed.current = false;
        setProfile(profile ?? EMPTY_PROFILE);
        setCachedDone(done);
      } catch (error) {
        console.error('Hent profil fejlede:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authReady, uid]);

  useEffect(() => {
    if (loading || !changed.current) return undefined;
    const timer = setTimeout(() => {
      saveUserProfile(uid, user).catch((error) => console.error('Gem profil fejlede:', error));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [user, loading, uid]);

  const setUser = useCallback((update) => {
    changed.current = true;
    setProfile(update);
  }, []);

  const completeOnboarding = useCallback(async () => {
    const completed = { ...user, onboardingCompletedAt: new Date().toISOString() };
    changed.current = false;
    setProfile(completed);
    setCachedDone(true);
    try {
      await saveOnboardingDone();
      await saveUserProfile(uid, completed);
    } catch (error) {
      console.error('Gem profil fejlede:', error);
    }
  }, [user, uid]);

  return {
    user,
    setUser,
    loading,
    showOnboarding: needsOnboarding({ cachedDone, profile: user }),
    completeOnboarding,
  };
}
