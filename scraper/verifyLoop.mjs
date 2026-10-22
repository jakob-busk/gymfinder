// Live-tjek og stikprøve-bevis for LOOP (testlag 2 og 3): henter LOOP med den rigtige parser,
// kører nat-jobbet tørt på resultatet (intet skrives), vælger 3 tilfældige Centre og
// sammenligner scraperens tal med det, centersiden og dens priskort viser. Ældre Sagen-rabatten
// sammenlignes med Ældre Sagens egen side. Resultatet skrives i docs/verifikation-loop.md.
// Køres igen, hver gang LOOP-parseren ændres. Ca. 12 kald: centerliste, prisside, 3 × (centerside
// + 2 priskort) og Ældre Sagen.
//
//   npm run verify:loop
//
// Exit-kode 1, hvis noget afviger.
import { writeFile } from 'node:fs/promises';

import { scrapeLoop } from './chains/loop.mjs';
import { createHttpClient } from './http.mjs';
import {
  AELDRE_SAGEN_LOOP_URL,
  LOOP_AJAX_URL,
  compareAeldreSagen,
  compareLoopCenter,
  formatLoopVerification,
  parseVisibleCenterPage,
} from './loopVerification.mjs';
import { runNightlyJob, todayInDenmark } from './nightlyJob.mjs';
import { pickRandom } from './verification.mjs';

const OUTPUT = new URL('../docs/verifikation-loop.md', import.meta.url);
const SAMPLE_SIZE = 3;

try {
  const http = createHttpClient();
  const today = todayInDenmark();
  const scraped = await scrapeLoop({ http, today });

  // Tør nat-kørsel på de samme data: sanity-regler og kædeniveau uden at skrive.
  const { report } = await runNightlyJob({
    db: null,
    today,
    dryRun: true,
    scrapers: [{ chainId: 'loop', scrape: async () => scraped }],
  });

  const results = [];
  for (const center of pickRandom(scraped.centers, SAMPLE_SIZE)) {
    const html = await http.getText(center.signupUrl);
    const { priceCards, nonce } = parseVisibleCenterPage(html);
    const answers = {};
    for (const card of priceCards.filter((candidate) => candidate.subscription !== 'kids')) {
      const text = await http.postForm(LOOP_AJAX_URL, {
        action: 'loop_get_subscription',
        center_id: card.centerId,
        subscription: card.subscription,
        _ajax_nonce: nonce ?? '',
      });
      answers[card.subscription] = JSON.parse(text);
    }
    results.push(compareLoopCenter(center, html, answers));
  }
  results.push(compareAeldreSagen(scraped.chain, await http.getText(AELDRE_SAGEN_LOOP_URL)));

  const { markdown, allOk } = formatLoopVerification({
    date: today,
    results,
    liveRun: report.chains[0],
  });
  await writeFile(OUTPUT, markdown);
  console.log(markdown);
  if (!allOk) process.exitCode = 1;
} catch (error) {
  console.error('Stikprøven fejlede:', error);
  process.exitCode = 1;
}
