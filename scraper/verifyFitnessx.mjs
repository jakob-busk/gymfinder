// Stikprøve-bevis for Fitness X (testlag 2 og 3): henter centerlisten, prislisten og 3 tilfældige
// centersider fra fitnessx.dk, sammenligner scraperens tal med prislisten og centersidens adresse
// og prissætter hele Kæden ud fra de hentede sider uden at skrive noget. Resultatet skrives i
// docs/verifikation-fitnessx.md. Køres igen, hver gang Fitness X-parseren ændres. 5 kald plus
// én pr. Center uden GUID i centerlisten (i dag 9 kald i alt).
//
//   npm run verify:fitnessx
//   npm run verify:fitnessx -- --center fitnessx-hasselager   et bestemt Center + 2 tilfældige
//
// Exit-kode 1, hvis noget afviger.
import {
  FITNESSX_CENTER_LIST_URL,
  FITNESSX_PRICE_LIST_URL,
  parseCenterList,
  parsePriceList,
} from './chains/fitnessx.mjs';
import {
  checkWholeChain,
  compareFitnessxCenter,
  formatFitnessxVerification,
} from './fitnessxVerification.mjs';
import { SAMPLE_SIZE, pickRandom, runVerification } from './verification.mjs';

await runVerification('verifikation-fitnessx.md', async ({ http, today }) => {
  const listed = parseCenterList(await http.getText(FITNESSX_CENTER_LIST_URL));
  const priceList = parsePriceList(await http.getText(FITNESSX_PRICE_LIST_URL));

  // Kun Centre med en centerside kan sammenlignes med adresselinjen.
  const withPage = listed.filter((center) => center.signupUrl);
  const pages = [];
  const results = [];
  // Centre valgt med --center kommer med; resten af stikprøven er tilfældig.
  const chosenIds = process.argv.flatMap((arg, i) =>
    process.argv[i - 1] === '--center' ? [arg] : [],
  );
  const chosen = withPage.filter((center) => chosenIds.includes(center.id));
  if (chosen.length < chosenIds.length) {
    throw new Error(`Ukendt Center eller Center uden centerside: ${chosenIds.join(', ')}`);
  }
  const others = withPage.filter((center) => !chosen.includes(center));
  const sample = [...chosen, ...pickRandom(others, Math.max(SAMPLE_SIZE - chosen.length, 0))];
  for (const center of sample) {
    const html = await http.getText(center.signupUrl);
    pages.push({ listed: center, html });
    results.push(compareFitnessxCenter(center, html, priceList));
  }

  // Centre uden GUID i centerlisten kan kun prissættes ud fra deres egen side; hent også dem,
  // så hele Kæden er dækket (i dag 4 Centre).
  const fetched = new Set(pages.map((page) => page.listed.id));
  for (const center of withPage.filter((c) => !c.guid && !fetched.has(c.id))) {
    pages.push({ listed: center, html: await http.getText(center.signupUrl) });
  }

  return formatFitnessxVerification({
    date: today,
    results,
    wholeChain: checkWholeChain(listed, pages, today),
  });
});
