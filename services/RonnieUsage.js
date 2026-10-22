import { ref, get, set } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { rtdb } from '../database/firebase';
import { addQuestion, isoWeekKey, mergeUsage, remainingQuestions } from '../data/ronnieUsage';

// Tælleren for Spørg Ronnies ugentlige grænse gemmes i Realtime Database under
// Users/<uid>/ronnieUsage, så den følger brugeren (også på en anden telefon). En kopi gemmes i
// AsyncStorage, så grænsen også gælder uden Firebase-nøgler og offline. Formen og selve
// grænsen er beskrevet i data/ronnieUsage.js.

const localUsageKey = (uid) => `gymfinder:ronnieUsage:${uid ?? 'local'}`;
const usagePath = (uid) => `Users/${uid}/ronnieUsage`;

// Uden forbindelse kan et opslag i databasen hænge; så bruges den lokale kopi.
const LOAD_TIMEOUT_MS = 5000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Ingen forbindelse til databasen')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function loadLocalUsage(uid) {
  try {
    const json = await AsyncStorage.getItem(localUsageKey(uid));
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Hent Ronnie-tæller fejlede:', error);
    return null;
  }
}

async function loadRemoteUsage(uid) {
  if (!rtdb || !uid) return null;
  try {
    const snapshot = await withTimeout(get(ref(rtdb, usagePath(uid))), LOAD_TIMEOUT_MS);
    return snapshot.val();
  } catch (error) {
    console.error('Hent Ronnie-tæller fra databasen fejlede:', error);
    return null;
  }
}

// Ugens forbrug ({ week, count }) samlet fra databasen og telefonen.
async function loadUsage(uid, weekKey) {
  const [remote, local] = await Promise.all([loadRemoteUsage(uid), loadLocalUsage(uid)]);
  return mergeUsage(remote, local, weekKey);
}

// Hvor mange spørgsmål brugeren har tilbage til Ronnie i denne uge.
export async function loadRemainingRonnieQuestions(uid, now = new Date()) {
  const weekKey = isoWeekKey(now);
  return remainingQuestions(await loadUsage(uid, weekKey), weekKey);
}

// Tæller ét spørgsmål og returnerer, hvor mange der er tilbage. Kan databasen ikke skrives,
// gælder den lokale kopi stadig, og fejlen logges.
export async function recordRonnieQuestion(uid, now = new Date()) {
  const weekKey = isoWeekKey(now);
  const next = addQuestion(await loadUsage(uid, weekKey), weekKey);
  try {
    await AsyncStorage.setItem(localUsageKey(uid), JSON.stringify(next));
  } catch (error) {
    console.error('Gem Ronnie-tæller fejlede:', error);
  }
  if (rtdb && uid) {
    try {
      await set(ref(rtdb, usagePath(uid)), next);
    } catch (error) {
      console.error('Gem Ronnie-tæller i databasen fejlede:', error);
    }
  }
  return remainingQuestions(next, weekKey);
}

// Ved log ud: fjern tælleren fra telefonen. Tælleren på kontoen røres ikke, så grænsen
// stadig gælder, når brugeren logger ind igen.
export async function clearLocalRonnieUsage(uid) {
  await AsyncStorage.multiRemove([localUsageKey(uid), localUsageKey(null)]);
}
