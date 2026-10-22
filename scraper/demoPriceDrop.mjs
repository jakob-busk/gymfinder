// Demo: fremtving et prisfald i ét Center og send push for de Prisalarmer, det udløser. Bruges
// til at vise push uden at vente på et rigtigt prisfald. Sender RIGTIGE push via Expo.
//
//   npm run demo:prisfald -- --center sats-412             sænk priserne 100 kr/md og send push
//   npm run demo:prisfald -- --center sats-412 --kr 150    andet beløb (højst 30 % pr. pris)
//   npm run demo:prisfald -- --center sats-412 --dry-run   vis hvad der ville ske; intet skrives
//
// Forudsætter en bruger med en Prisalarm på Centret (♥ og alarm på Favoritter-skærmen, gerne
// uden tærskel) og et push-token fra en iPhone med Expo Go. Næste nats scraping sætter de
// rigtige priser tilbage. Nøgler som ved seed og scrape (scraper/.env); EXPO_ACCESS_TOKEN kun,
// hvis push security er slået til i Expo-projektet.
import { createExpoPushClient } from './expoPush.mjs';
import { todayInDenmark } from './dates.mjs';
import { priceAlertLines } from './nightlyReport.mjs';
import { runPriceDropDemo } from './priceDropDemo.mjs';

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const centerId = argValue('--center');
const amount = Number(argValue('--kr') ?? 100);
const dryRun = process.argv.includes('--dry-run');

let connection = null;
try {
  if (!centerId) throw new Error('Angiv Centret med --center <centerId>, fx --center sats-412.');
  // Admin-SDK'et hentes først her, ligesom i index.mjs.
  const { connectDatabase } = await import('./db.mjs');
  connection = connectDatabase();

  const pushClient = createExpoPushClient({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  const { update, report } = await runPriceDropDemo({
    db: connection.db,
    pushClient,
    centerId,
    amount,
    today: todayInDenmark(),
    dryRun,
  });

  const lowered = Object.keys(update).filter((path) => path.startsWith('Offers/')).length;
  console.log(`${dryRun ? 'Tør kørsel: ville sænke' : 'Sænkede'} ${lowered} Tilbud i ${centerId}.`);
  console.log(priceAlertLines(report).join('\n'));
  if (!dryRun && report.sent.length === 0) {
    console.error('Ingen push sendt. Har en bruger en Prisalarm på Centret og et push-token?');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Demo-prisfald fejlede:', error.message);
  process.exitCode = 1;
} finally {
  // Ellers holder forbindelsen til databasen processen i live.
  await connection?.close();
}
