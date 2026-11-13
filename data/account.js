// Konto: validering af formularen og danske fejltekster til Firebase Auth-fejl.
// Ren JavaScript uden React Native eller Firebase, så den kan testes direkte.

// Firebase kræver mindst 6 tegn.
export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Felterne til "Opret konto" (mode 'create') eller "Log ind" (mode 'login').
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
// Fejl, brugeren ikke selv kan rette (opsætningen af appen). Brugeren får en kort, venlig tekst;
// den tekniske forklaring står i SETUP_HINTS og skrives i konsollen til udviklerne.
const ACCOUNT_UNAVAILABLE = 'Konto virker ikke lige nu. Du kan fortsætte uden konto.';
const GENERIC_ERROR = 'Noget gik galt. Prøv igen om lidt.';

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
  'auth/internal-error': GENERIC_ERROR,
  'auth/operation-not-allowed': ACCOUNT_UNAVAILABLE,
  'auth/admin-restricted-operation':
    'Nye konti kan ikke oprettes lige nu. Du kan fortsætte uden konto.',
  'auth/configuration-not-found': ACCOUNT_UNAVAILABLE,
  'auth/invalid-api-key': ACCOUNT_UNAVAILABLE,
  'auth/app-not-authorized': ACCOUNT_UNAVAILABLE,
  'account/unavailable': ACCOUNT_UNAVAILABLE,
  PERMISSION_DENIED:
    'Dine oplysninger kunne ikke gemmes på din konto lige nu. De er gemt på telefonen.',
};

// Hvad der skal rettes i Firebase-projektet. Skrives kun i konsollen (console.warn), aldrig i appen.
const SETUP_HINTS = {
  'auth/internal-error': 'Intern fejl hos Firebase Auth.',
  'auth/operation-not-allowed':
    'Slå Email/Password til i Firebase: Authentication → Sign-in method → Email/Password.',
  'auth/admin-restricted-operation':
    'Firebase tillader ikke oprettelse af brugere (Authentication → Settings → User actions).',
  'auth/configuration-not-found': 'Authentication er ikke startet i Firebase-projektet.',
  'auth/invalid-api-key': 'Ugyldig Firebase API-nøgle (EXPO_PUBLIC_FIREBASE_* i .env).',
  'auth/app-not-authorized': 'Appen er ikke godkendt i Firebase-projektet.',
  'account/unavailable': 'Firebase er ikke sat op (.env mangler EXPO_PUBLIC_FIREBASE_*).',
  PERMISSION_DENIED: 'Realtime Database-reglerne afviste skrivningen (fx udløbet testtilstand).',
};

function warnDeveloper(code, hint) {
  console.warn(`[Konto] ${code}${hint ? `: ${hint}` : ''}`);
}

// Firebase-fejl (eller en fejlkode) → forståelig dansk tekst til brugeren. Opsætningsfejl og
// ukendte fejlkoder skrives desuden i konsollen med fejlkoden, så de kan findes igen.
export function accountErrorMessage(error) {
  const code = typeof error === 'string' ? error : error?.code;
  // Firebase laver koden ud fra serverens tekst, fx 'auth/api-key-not-valid.-please-pass-...'.
  if (typeof code === 'string' && code.startsWith('auth/api-key-not-valid')) {
    warnDeveloper(code, SETUP_HINTS['auth/invalid-api-key']);
    return ACCOUNT_UNAVAILABLE;
  }
  if (SETUP_HINTS[code]) warnDeveloper(code, SETUP_HINTS[code]);
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (code) warnDeveloper(code, error?.message);
  return GENERIC_ERROR;
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
