// Stikprøve-bevis for Fitness X (testlag 2 og 3): henter centerlisten, prislisten og 3 tilfældige
// centersider fra fitnessx.dk, sammenligner scraperens tal med prislisten og centersidens adresse
// og prissætter hele Kæden ud fra de hentede sider uden at skrive noget. Resultatet skrives i
// docs/verifikation-fitnessx.md. Køres igen, hver gang Fitness X-parseren ændres. 5 kald i alt.
//
//   npm run verify:fitnessx
//
// Exit-kode 1, hvis noget afviger.
import { writeFile } from 'node:fs/promises';

import {
  FITNESSX_CENTER_LIST_URL,
  FITNESSX_PRICE_LIST_URL,
  parseCenterList,
  parsePriceList,
} from './chains/fitnessx.mjs';
import { createHttpClient } from './http.mjs';
import { todayInDenmark } from './nightlyJob.mjs';
import { pickRandom } from './verification.mjs';
import {
  checkWholeChain,
  compareFitnessxCenter,
  formatFitnessxVerification,
} from './verificationFitnessx.mjs';

const OUTPUT = new URL('../docs/verifikation-fitnessx.md', import.meta.url);
const SAMPLE_SIZE = 3;

try {
  const http = createHttpClient();
  const today = todayInDenmark();
  const listed = parseCenterList(await http.getText(FITNESSX_CENTER_LIST_URL));
  const priceList = parsePriceList(await http.getText(FITNESSX_PRICE_LIST_URL));

  // Kun Centre med en centerside kan sammenlignes med adresselinjen.
  const withPage = listed.filter((center) => center.signupUrl);
  const pages = [];
  const results = [];
  for (const center of pickRandom(withPage, SAMPLE_SIZE)) {
    const html = await http.getText(center.signupUrl);
    pages.push({ listed: center, html });
    results.push(compareFitnessxCenter(center, html, priceList));
  }

  const { markdown, allOk } = formatFitnessxVerification({
    date: today,
    results,
    wholeChain: checkWholeChain(listed, pages, today),
  });
  await writeFile(OUTPUT, markdown);
  console.log(markdown);
  if (!allOk) process.exitCode = 1;
} catch (error) {
  console.error('Stikprøven fejlede:', error);
  process.exitCode = 1;
}
