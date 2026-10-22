import { isFirebaseConfigured } from './firebaseConfig';

const REAL_LOOKING = {
  apiKey: 'AIzaSyExampleExampleExample',
  authDomain: 'gymfinder-test.firebaseapp.com',
  projectId: 'gymfinder-test',
  appId: '1:123:web:abc',
  databaseURL: 'https://gymfinder-test-default-rtdb.europe-west1.firebasedatabase.app',
};

// Værdierne fra .env.example, som de ser ud efter `cp .env.example .env`.
const FROM_ENV_EXAMPLE = {
  apiKey: '<api-noegle>',
  authDomain: '<projekt-id>.firebaseapp.com',
  projectId: '<projekt-id>',
  appId: '<app-id>',
  databaseURL: 'https://<projekt-id>-default-rtdb.europe-west1.firebasedatabase.app',
};

describe('Firebase-konfiguration', () => {
  test('udfyldt konfiguration er klar', () => {
    expect(isFirebaseConfigured(REAL_LOOKING)).toBe(true);
    expect(
      isFirebaseConfigured({ ...REAL_LOOKING, databaseURL: 'https://gymfinder.firebaseio.com' }),
    ).toBe(true);
  });

  test('pladsholderne fra .env.example tæller som ikke sat op', () => {
    expect(isFirebaseConfigured(FROM_ENV_EXAMPLE)).toBe(false);
  });

  test('manglende .env (undefined) tæller som ikke sat op', () => {
    expect(isFirebaseConfigured({})).toBe(false);
    expect(isFirebaseConfigured(undefined)).toBe(false);
    expect(isFirebaseConfigured({ ...REAL_LOOKING, appId: '  ' })).toBe(false);
  });

  test('ugyldig database-URL tæller som ikke sat op', () => {
    expect(isFirebaseConfigured({ ...REAL_LOOKING, databaseURL: 'gymfinder-test' })).toBe(false);
  });
});
