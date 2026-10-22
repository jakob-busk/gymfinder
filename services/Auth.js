import { useCallback, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { auth } from '../database/firebase';
import { describeAccount } from '../data/account';
import { clearLocalFavorites } from './Favorites';
import { clearLocalPriceAlerts } from './PriceAlerts';
import { clearLocalUserData } from './UserProfile';

// Konto kræver Firebase. Uden .env gemmes brugerdata kun på telefonen.
export const accountsAvailable = Boolean(auth);

function requireAuth() {
  if (auth) return auth;
  const error = new Error('Firebase er ikke sat op');
  error.code = 'account/unavailable';
  throw error;
}

// Sørger for, at der altid er en bruger: findes der ingen (første opstart), oprettes en anonym.
// Firebase gemmer brugeren i AsyncStorage, så samme uid bruges efter genstart, og brugerdata
// under Users/<uid> følger med. Kalder onUserChange med Firebase-brugeren, eller med null, hvis
// Firebase ikke er sat op eller login fejler (så gemmes brugerdata kun på telefonen).
// Returnerer en funktion, der stopper lytningen.
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
      onUserChange(null);
    });
  });
}

// "Gem din profil": den anonyme bruger linkes til e-mail og adgangskode. uid'et bevares, så
// profil, Favoritter og Prisalarmer under Users/<uid> følger med uden at blive kopieret.
// Lykkedes det anonyme login ikke, oprettes en ny konto i stedet.
// Returnerer Firebase-brugeren. Fejl har Firebase' fejlkode (se accountErrorMessage).
export async function createAccount({ name, email, password }) {
  const firebaseAuth = requireAuth();
  const current = firebaseAuth.currentUser;
  const { user } = current?.isAnonymous
    ? await linkWithCredential(current, EmailAuthProvider.credential(email, password))
    : await createUserWithEmailAndPassword(firebaseAuth, email, password);
  await updateProfile(user, { displayName: name });
  return user;
}

// Log ind på en eksisterende konto, fx på en ny telefon. uid'et skifter til kontoens, og
// profilen hentes derfra (se useUserProfile).
export async function logIn({ email, password }) {
  const { user } = await signInWithEmailAndPassword(requireAuth(), email, password);
  return user;
}

// Log ud: den lokale kopi af brugerens data (profil, Favoritter og Prisalarm) slettes først, så den næste, der bruger telefonen,
// starter forfra med onboarding. Data på kontoen bliver liggende i databasen.
// Bagefter oprettes automatisk en ny anonym bruger (startAnonymousSession).
export async function logOut(uid) {
  const firebaseAuth = requireAuth();
  await clearLocalUserData(uid);
  await clearLocalFavorites(uid);
  await clearLocalPriceAlerts(uid);
  await signOut(firebaseAuth);
}

// Login-status til hele appen (bruges i App.js). Returnerer:
//   authUser       Firebase-brugeren, eller null uden Firebase
//   account        { uid, isAnonymous, email, name } til visning, eller null
//   authReady      true, når den første bruger er klar
//   createAccount  opgraderer den anonyme bruger (se createAccount ovenfor)
//   logIn, logOut
export function useAuthSession() {
  const [authUser, setAuthUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(
    () =>
      startAnonymousSession((firebaseUser) => {
        setAuthUser(firebaseUser);
        setAccount(describeAccount(firebaseUser));
        setAuthReady(true);
      }),
    [],
  );

  // Linkning skifter ikke bruger, så Firebase melder ingen ændring. Visningen opdateres her.
  const handleCreateAccount = useCallback(async (form) => {
    const user = await createAccount(form);
    setAccount(describeAccount(user));
    return user;
  }, []);

  const handleLogOut = useCallback(() => logOut(authUser?.uid ?? null), [authUser]);

  return {
    authUser,
    account,
    authReady,
    createAccount: handleCreateAccount,
    logIn,
    logOut: handleLogOut,
  };
}
