// Forbindelse til Realtime Database med service-accounten. Admin-SDK'et omgår
// sikkerhedsreglerne, så kun scraperen og seed-scriptet kan skrive centerdata.
//
// Kræver to miljøvariabler (lokalt i scraper/.env, i GitHub Actions som secrets):
//   FIREBASE_SERVICE_ACCOUNT  hele service account-JSON'en på én linje
//   FIREBASE_DATABASE_URL     fx https://<projekt-id>-default-rtdb.europe-west1.firebasedatabase.app
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

export function connectDatabase(env = process.env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT || !env.FIREBASE_DATABASE_URL) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT og FIREBASE_DATABASE_URL skal være sat.');
  }

  const app = initializeApp({
    credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: env.FIREBASE_DATABASE_URL,
  });

  return { db: getDatabase(app), close: () => app.delete() };
}
