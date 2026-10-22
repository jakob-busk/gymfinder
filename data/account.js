// Konto: validering af formularen og danske fejltekster til Firebase Auth-fejl.
// Ren JavaScript uden React Native eller Firebase, så den kan testes direkte.

// Firebase kræver mindst 6 tegn.
export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Felterne til "Gem din profil" (mode 'create') eller "Log ind" (mode 'login').
// Returnerer { name, email, password } renset for mellemrum, eller { error } på dansk.
export function validateAccountForm({ name, email, password }, mode = 'create') {
  const cleanName = String(name ?? '').trim();
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const cleanPassword = String(password ?? '');

  if (mode === 'create' && !cleanName) return { error: 'Udfyld dit navn.' };
  if (!cleanEmail) return { error: 'Udfyld din e-mail.' };
  if (!EMAIL_PATTERN.test(cleanEmail)) return { error: 'Tjek din e-mail. Den ser ikke rigtig ud.' };
  if (!cleanPassword) return { error: 'Udfyld din adgangskode.' };
  if (mode === 'create' && cleanPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Adgangskoden skal være mindst ${MIN_PASSWORD_LENGTH} tegn.` };
  }

  return { name: cleanName, email: cleanEmail, password: cleanPassword };
}

const EMAIL_IN_USE = 'Der findes allerede en konto med den e-mail. Log ind i stedet.';
const FIREBASE_SETUP_ERROR =
  'Appens forbindelse til Firebase er sat forkert op (ugyldig API-nøgle eller app). ' +
  'Fortsæt anonymt indtil videre.';

const ERROR_MESSAGES = {
  'auth/email-already-in-use': EMAIL_IN_USE,
  'auth/credential-already-in-use': EMAIL_IN_USE,
  'auth/weak-password': `Adgangskoden er for svag. Brug mindst ${MIN_PASSWORD_LENGTH} tegn.`,
  'auth/invalid-email': 'Tjek din e-mail. Den ser ikke rigtig ud.',
  'auth/missing-password': 'Udfyld din adgangskode.',
  // Nyere Firebase-projekter skelner ikke mellem forkert kode og ukendt e-mail.
  'auth/invalid-credential': 'Forkert e-mail eller adgangskode.',
  'auth/wrong-password': 'Forkert e-mail eller adgangskode.',
  'auth/user-not-found': 'Forkert e-mail eller adgangskode.',
  'auth/user-disabled': 'Kontoen er spærret.',
  'auth/too-many-requests': 'For mange forsøg. Vent lidt, og prøv igen.',
  'auth/network-request-failed': 'Ingen forbindelse. Tjek dit internet, og prøv igen.',
  'auth/provider-already-linked': 'Du har allerede en konto.',
  'auth/requires-recent-login': 'Log ind igen, og prøv så igen.',
  'auth/password-does-not-meet-requirements':
    'Adgangskoden opfylder ikke kravene. Brug en længere kode med både bogstaver og tal.',
  'auth/internal-error': 'Der skete en fejl hos Firebase. Prøv igen om lidt.',
  // Opsætningsfejl i Firebase-projektet. Brugeren kan ikke selv rette dem, men kan fortsætte
  // anonymt; teksten siger, hvad der mangler, så fejlen kan rettes i Firebase-konsollen.
  'auth/operation-not-allowed':
    'Konto med e-mail og adgangskode er ikke slået til i GymFinder endnu (Firebase: ' +
    'Authentication → Sign-in method → Email/Password). Fortsæt anonymt indtil videre.',
  'auth/admin-restricted-operation':
    'Nye konti er slået fra i GymFinder lige nu (Firebase tillader ikke oprettelse af ' +
    'brugere). Fortsæt anonymt indtil videre.',
  'auth/configuration-not-found':
    'Login er ikke sat op i GymFinders Firebase-projekt endnu (Authentication er ikke ' +
    'startet). Fortsæt anonymt indtil videre.',
  'auth/invalid-api-key': FIREBASE_SETUP_ERROR,
  'auth/app-not-authorized': FIREBASE_SETUP_ERROR,
  'account/unavailable': 'Konto kræver forbindelse til databasen, som ikke er sat op.',
  // Realtime Database: reglerne afviser skrivningen (fx udløbet testtilstand).
  PERMISSION_DENIED:
    'Databasen afviste at gemme dine oplysninger, fordi dens regler ikke tillader det lige ' +
    'nu. De er gemt på telefonen.',
};

// Firebase-fejl (eller en fejlkode) → forståelig dansk tekst til brugeren. En ukendt fejl får
// en generel tekst med fejlkoden, så den kan findes igen.
export function accountErrorMessage(error) {
  const code = typeof error === 'string' ? error : error?.code;
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  // Firebase laver koden ud fra serverens tekst, fx 'auth/api-key-not-valid.-please-pass-...'.
  if (typeof code === 'string' && code.startsWith('auth/api-key-not-valid')) {
    return FIREBASE_SETUP_ERROR;
  }
  if (code) return `Noget gik galt (fejlkode: ${code}). Prøv igen om lidt.`;
  return 'Noget gik galt. Prøv igen om lidt.';
}

// Firebase-brugeren → det, appen viser om kontoen. null, hvis der ikke er nogen bruger.
//   { uid, isAnonymous, email, name }
export function describeAccount(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    isAnonymous: Boolean(user.isAnonymous),
    email: user.email ?? null,
    name: user.displayName ?? null,
  };
}
