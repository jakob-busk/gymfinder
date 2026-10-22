// Natlig scraper. Køres af GitHub Actions hver nat og kan startes manuelt.
//
//   npm run scrape                      henter alle Kæder og skriver til databasen
//   npm run scrape:dry-run              live-kørsel uden skrivning; laver kun en rapport
//   node index.mjs --dry-run --limit 3  live-kørsel med kun 3 Centre pr. Kæde (få kald)
//   ... --chain puregym                 kun én Kæde
//   ... --report <fil>                  gemmer rapporten som Markdown
//
// Exit-kode 1, hvis en Kæde blev sprunget over eller jobbet fejlede, så kørslen bliver rød.
import { appendFile, writeFile } from 'node:fs/promises';

import { CHAIN_SCRAPERS } from './chains/index.mjs';
import { createHttpClient } from './http.mjs';
import { formatReport, runNightlyJob, todayInDenmark } from './nightlyJob.mjs';

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const dryRun = process.argv.includes('--dry-run');
const limit = Number(argValue('--limit')) || undefined;
const reportFile = argValue('--report');
const onlyChain = argValue('--chain');
const hasDatabase = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_DATABASE_URL,
);

let connection = null;
try {
  if (!dryRun || hasDatabase) {
    // Admin-SDK'et hentes først her, så en tør kørsel uden nøgler virker uden databasen.
    const { connectDatabase } = await import('./db.mjs');
    connection = connectDatabase();
  }

  const today = todayInDenmark();
  const http = createHttpClient();
  const scrapers = CHAIN_SCRAPERS.filter(({ chainId }) => !onlyChain || chainId === onlyChain).map(
    ({ chainId, scrape }) => ({
      chainId,
      scrape: () => scrape({ http, today, limit }),
    }),
  );
  if (scrapers.length === 0) throw new Error(`Ukendt Kæde: ${onlyChain}`);

  const db = connection?.db ?? null;
  const { ok, report } = await runNightlyJob({ db, scrapers, today, dryRun });
  const markdown = formatReport(report);

  console.log(markdown);
  if (reportFile) await writeFile(reportFile, markdown);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);

  for (const chain of report.chains) {
    for (const failure of chain.failures) {
      const where = [chain.chainId, failure.centerId, failure.offerId].filter(Boolean).join(' / ');
      console.error(`Sanity-fejl i ${where}:`, failure.problems.join('; '));
    }
    if (chain.status === 'skipped') {
      console.error(`Kæden ${chain.chainId} sprunget over:`, chain.reason);
    }
  }
  if (!ok) process.exitCode = 1;
} catch (error) {
  console.error('Scraperen fejlede:', error);
  process.exitCode = 1;
} finally {
  // Ellers holder forbindelsen til databasen processen i live.
  await connection?.close();
}
