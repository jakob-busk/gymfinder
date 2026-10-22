// Afgør om Firebase-konfigurationen fra .env er udfyldt. Ren funktion uden Firebase-import,
// så den kan testes uden netværk.
//
// Appen skal kunne starte uden rigtige nøgler (fx med værdierne fra .env.example). I så fald
// bruges eksempeldata, og der logges ikke ind.

const REQUIRED_KEYS = ['apiKey', 'projectId', 'appId', 'databaseURL'];

// Pladsholdere i .env.example skrives i vinkelparenteser, fx <din-api-noegle>.
const isPlaceholder = (value) => value.includes('<') || value.includes('>');

const isDatabaseUrl = (value) =>
  /^https:\/\/[^/\s]+\.(firebasedatabase\.app|firebaseio\.com)\/?$/.test(value);

export function isFirebaseConfigured(config) {
  if (!config) return false;

  const allFilled = REQUIRED_KEYS.every((key) => {
    const value = config[key];
    return typeof value === 'string' && value.trim() !== '' && !isPlaceholder(value);
  });

  return allFilled && isDatabaseUrl(config.databaseURL.trim());
}
