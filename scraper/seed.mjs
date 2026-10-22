// Lægger de håndindtastede Kæder, Centre og Tilbud fra data/const.js i Realtime Database.
//
//   npm run seed            skriver til databasen (kræver service-account, se db.mjs)
//   npm run seed:dry-run    skriver kun opdateringen ud, rører ikke databasen
//
// Idempotent: hver Kæde, hvert Center og hvert Centers Tilbud overskrives på sin egen sti i én
// samlet opdatering, så scriptet kan køres igen med samme resultat. Andre Kæder og brugerdata
// røres ikke.
//
// Kæder, som den natlige scraper har overtaget (chains/index.mjs), springes over, så seed aldrig
// overskriver rigtige priser med håndindtastede.
import { CHAINS as ALL_CHAINS, CENTERS as ALL_CENTERS } from '../data/const.js';
import { buildSeedUpdate } from '../data/centerData.js';
import { SCRAPED_CHAIN_IDS } from './chains/index.mjs';

const CHAINS = ALL_CHAINS.filter((chain) => !SCRAPED_CHAIN_IDS.includes(chain.id));
const CENTERS = ALL_CENTERS.filter((center) => !SCRAPED_CHAIN_IDS.includes(center.chainId));
const update = buildSeedUpdate({ chains: CHAINS, centers: CENTERS });

if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify(update, null, 2));
} else {
  // Admin-SDK'et hentes først her, så en tør kørsel virker uden installerede pakker.
  const { connectDatabase } = await import('./db.mjs');
  let connection = null;
  try {
    connection = connectDatabase();
    await connection.db.ref().update(update);
    console.log(`Seed færdig: ${CHAINS.length} Kæder og ${CENTERS.length} Centre skrevet.`);
  } catch (error) {
    console.error('Seed fejlede:', error.message);
    process.exitCode = 1;
  } finally {
    // Ellers holder forbindelsen til databasen processen i live.
    await connection?.close();
  }
}
