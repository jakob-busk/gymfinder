// Stikprøve-bevis for PureGym (testlag 3): henter 3 tilfældige Centre fra puregym.dk med samme
// kald som nat-jobbet, sammenligner scraperens tal med det, hjemmesiden viser, og skriver
// resultatet i docs/verifikation-puregym.md. Køres igen, hver gang PureGym-parseren ændres.
// 14 kald i alt: centerliste, prisliste og pr. Center formular, to POST og centersiden.
//
//   npm run verify:puregym
//
// Exit-kode 1, hvis noget afviger.
import { writeFile } from 'node:fs/promises';

import {
  PUREGYM_CENTER_LIST_URL,
  PUREGYM_PRICE_LIST_URL,
  buildCenter,
  fetchCenterResponses,
  parseCenterList,
  parsePriceList,
} from './chains/puregym.mjs';
import { createHttpClient } from './http.mjs';
import { todayInDenmark } from './nightlyJob.mjs';
import { PUREGYM_VERIFICATION_DESCRIPTION, compareCenter } from './puregymVerification.mjs';
import { formatVerification, pickRandom } from './verification.mjs';

const OUTPUT = new URL('../docs/verifikation-puregym.md', import.meta.url);
const SAMPLE_SIZE = 3;

try {
  const today = todayInDenmark();
  const http = createHttpClient();
  const listed = parseCenterList(await http.getText(PUREGYM_CENTER_LIST_URL));
  const fees = parsePriceList(await http.getText(PUREGYM_PRICE_LIST_URL));

  const results = [];
  for (const center of pickRandom(listed, SAMPLE_SIZE)) {
    try {
      const responses = await fetchCenterResponses({ http, center });
      const built = buildCenter({ listed: center, responses, fees, today });
      const centerPageHtml = await http.getText(center.pageUrl);
      results.push(
        compareCenter({ listed: center, center: built.center, responses, centerPageHtml }),
      );
    } catch (error) {
      // Et Center, scraperen ikke kan læse, er også en afvigelse.
      results.push({
        centerId: center.id,
        name: center.name,
        url: center.pageUrl,
        checks: [{ what: 'Kunne læses', scraper: error.message, website: 'ja', ok: false }],
      });
    }
  }

  const { markdown, allOk } = formatVerification({
    chainName: 'PureGym',
    date: today,
    results,
    description: [
      ...PUREGYM_VERIFICATION_DESCRIPTION,
      '',
      `Oprettelsesgebyr (fra /priser): ${fees.signupFee} kr. ` +
        `Admingebyr ved kortbetaling: ${fees.adminFee} kr/md.`,
    ],
  });
  await writeFile(OUTPUT, markdown);
  console.log(markdown);
  if (!allOk) process.exitCode = 1;
} catch (error) {
  console.error('Stikprøven fejlede:', error);
  process.exitCode = 1;
}
