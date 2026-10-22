// Stikprøve-bevis for SATS (testlag 3): henter 3 tilfældige Centre fra sats.dk, sammenligner
// scraperens tal med det, hjemmesiden viser, og skriver resultatet i docs/verifikation-sats.md.
// Køres igen, hver gang SATS-parseren ændres. 4 kald i alt (liste + 3 centersider).
//
//   npm run verify:sats
//
// Exit-kode 1, hvis noget afviger.
import { SATS_CENTER_LIST_URL, parseCenterList } from './chains/sats.mjs';
import { SATS_VERIFICATION_DESCRIPTION, compareCenter } from './satsVerification.mjs';
import { SAMPLE_SIZE, formatVerification, pickRandom, runVerification } from './verification.mjs';

await runVerification('verifikation-sats.md', async ({ http, today }) => {
  const listed = parseCenterList(await http.getText(SATS_CENTER_LIST_URL));
  const results = [];
  for (const center of pickRandom(listed, SAMPLE_SIZE)) {
    results.push(compareCenter(center, await http.getText(center.signupUrl)));
  }

  return formatVerification({
    chainName: 'SATS',
    date: today,
    results,
    description: SATS_VERIFICATION_DESCRIPTION,
  });
});
