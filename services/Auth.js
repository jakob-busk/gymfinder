import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

import { auth } from '../database/firebase';

// Sørger for, at der altid er en bruger: findes der ingen (første opstart), oprettes en anonym.
// Firebase gemmer brugeren i AsyncStorage, så samme uid bruges efter genstart, og brugerdata
// under Users/<uid> følger med. Kalder onUserChange med Firebase-brugeren (eller null, hvis
// Firebase ikke er sat op). Returnerer en funktion, der stopper lytningen.
export function startAnonymousSession(onUserChange) {
  if (!auth) {
    onUserChange(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onUserChange(user);
      return;
    }
    signInAnonymously(auth).catch((error) => {
      console.error('Anonymt login fejlede:', error);
    });
  });
}
