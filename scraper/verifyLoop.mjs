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
import { scrapeLoop } from './chains/loop.mjs';
import {
  AELDRE_SAGEN_LOOP_URL,
  LOOP_AJAX_URL,
  compareAeldreSagen,
  compareLoopCenter,
  formatLoopVerification,
  parseVisibleCenterPage,
} from './loopVerification.mjs';
import { runNightlyJob } from './nightlyJob.mjs';
import { SAMPLE_SIZE, pickRandom, runVerification } from './verification.mjs';

await runVerification('verifikation-loop.md', async ({ http, today }) => {
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

  return formatLoopVerification({
    date: today,
    results,
    liveRun: report.chains[0],
  });
});
