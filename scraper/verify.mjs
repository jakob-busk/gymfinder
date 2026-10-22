// Stikprøve-bevis for SATS (testlag 3): henter 3 tilfældige Centre fra sats.dk, sammenligner
// scraperens tal med det, hjemmesiden viser, og skriver resultatet i docs/verifikation-sats.md.
// Køres igen, hver gang SATS-parseren ændres. 4 kald i alt (liste + 3 centersider).
//
//   npm run verify
//
// Exit-kode 1, hvis noget afviger.
import { writeFile } from 'node:fs/promises';

import { SATS_CENTER_LIST_URL, parseCenterList } from './chains/sats.mjs';
import { createHttpClient } from './http.mjs';
import { todayInDenmark } from './nightlyJob.mjs';
import { compareCenter, formatVerification, pickRandom } from './verification.mjs';

const OUTPUT = new URL('../docs/verifikation-sats.md', import.meta.url);
const SAMPLE_SIZE = 3;

try {
  const http = createHttpClient();
  const listed = parseCenterList(await http.getText(SATS_CENTER_LIST_URL));
  const results = [];
  for (const center of pickRandom(listed, SAMPLE_SIZE)) {
    results.push(compareCenter(center, await http.getText(center.signupUrl)));
  }

  const { markdown, allOk } = formatVerification({
    chainName: 'SATS',
    date: todayInDenmark(),
    results,
  });
  await writeFile(OUTPUT, markdown);
  console.log(markdown);
  if (!allOk) process.exitCode = 1;
} catch (error) {
  console.error('Stikprøven fejlede:', error);
  process.exitCode = 1;
}
