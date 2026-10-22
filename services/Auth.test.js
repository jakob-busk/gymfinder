// Konto: opgradering af den anonyme bruger, log ind og log ud. Firebase Auth er en falsk i
// hukommelsen med samme regler som den rigtige (link bevarer uid, e-mail kan kun bruges én gang),
// så testene ikke bruger netværk.
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockAuth = { currentUser: null, accounts: {}, nextUid: 1 };

const mockFail = (code) => {
  const error = new Error(code);
  error.code = code;
  throw error;
};

// Uden database gemmes profilen kun lokalt, hvilket er nok til at teste log ud.
jest.mock('../database/firebase', () => ({ auth: mockAuth, rtdb: null }));
jest.mock('firebase/database', () => ({}));

jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: (email, password) => ({ email, password }) },
  onAuthStateChanged: () => () => {},
  signInAnonymously: async (auth) => {
    auth.currentUser = { uid: `uid-${auth.nextUid++}`, isAnonymous: true, email: null };
    return { user: auth.currentUser };
  },
  linkWithCredential: async (user, { email, password }) => {
    if (mockAuth.accounts[email]) mockFail('auth/email-already-in-use');
    if (password.length < 6) mockFail('auth/weak-password');
    Object.assign(user, { isAnonymous: false, email });
    mockAuth.accounts[email] = { password, user };
    return { user };
  },
  createUserWithEmailAndPassword: async (auth, email, password) => {
    if (auth.accounts[email]) mockFail('auth/email-already-in-use');
    const user = { uid: `uid-${auth.nextUid++}`, isAnonymous: false, email };
    auth.accounts[email] = { password, user };
    auth.currentUser = user;
    return { user };
  },
  signInWithEmailAndPassword: async (auth, email, password) => {
    const account = auth.accounts[email];
    if (!account || account.password !== password) mockFail('auth/invalid-credential');
    auth.currentUser = account.user;
    return { user: account.user };
  },
  updateProfile: async (user, { displayName }) => {
    user.displayName = displayName;
  },
  signOut: async (auth) => {
    auth.currentUser = null;
  },
}));

const { signInAnonymously } = require('firebase/auth');
const { createAccount, logIn, logOut } = require('./Auth');
const { loadOnboardingDone, saveOnboardingDone, saveUserProfile } = require('./UserProfile');

const FORM = { name: 'Jakob', email: 'jakob@example.dk', password: 'hemmelig' };

beforeEach(async () => {
  await AsyncStorage.clear();
  mockAuth.currentUser = null;
  mockAuth.accounts = {};
  mockAuth.nextUid = 1;
});

test('den anonyme bruger opgraderes til en konto med samme uid', async () => {
  const { user: anonymous } = await signInAnonymously(mockAuth);

  const user = await createAccount(FORM);

  expect(user.uid).toBe(anonymous.uid);
  expect(user).toMatchObject({ isAnonymous: false, email: FORM.email, displayName: 'Jakob' });
});

test('en e-mail, der allerede har en konto, giver fejlkoden for e-mail i brug', async () => {
  await signInAnonymously(mockAuth);
  await createAccount(FORM);
  await logOut(mockAuth.currentUser.uid);
  await signInAnonymously(mockAuth);

  await expect(createAccount(FORM)).rejects.toMatchObject({ code: 'auth/email-already-in-use' });
});

test('log ind på en ny telefon giver kontoens uid', async () => {
  const { user: firstPhone } = await signInAnonymously(mockAuth);
  await createAccount(FORM);
  await logOut(firstPhone.uid);
  await signInAnonymously(mockAuth);

  const user = await logIn({ email: FORM.email, password: FORM.password });

  expect(user.uid).toBe(firstPhone.uid);
});

test('forkert adgangskode afvises', async () => {
  await signInAnonymously(mockAuth);
  await createAccount(FORM);

  await expect(logIn({ email: FORM.email, password: 'forkert' })).rejects.toMatchObject({
    code: 'auth/invalid-credential',
  });
});

test('log ud logger ud og rydder telefonen', async () => {
  const { user } = await signInAnonymously(mockAuth);
  await createAccount(FORM);
  await saveUserProfile(user.uid, { address: 'Østerbrogade 79' });
  await saveOnboardingDone();

  await logOut(user.uid);

  expect(mockAuth.currentUser).toBeNull();
  expect(await loadOnboardingDone()).toBe(false);
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});
