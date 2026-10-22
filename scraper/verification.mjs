// Fælles for stikprøve-beviserne (testlag 3) for alle Kæder: tilfældigt udvalg af Centre,
// rapporten som Markdown og skelettet, som verify*.mjs-scriptene kører i. Selve
// sammenligningen ligger pr. Kæde i <kæde>Verification.mjs.

import { writeFile } from 'node:fs/promises';

import { todayInDenmark } from './dates.mjs';
import { createHttpClient } from './http.mjs';

// Antal tilfældige Centre i hver stikprøve.
export const SAMPLE_SIZE = 3;

// Vælger n tilfældige elementer. `random` kan sendes ind, så testene er deterministiske.
export function pickRandom(items, n, random = Math.random) {
  const pool = [...items];
  const picked = [];
  while (picked.length < n && pool.length > 0) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return picked;
}

const show = (value) => (value == null ? '–' : String(value));

// `description` er forklaringen under overskriften (linjer); hver Kæde har sine egne kilder.
export function formatVerification({ chainName, date, results, description }) {
  const allOk = results.every((result) => result.checks.every((check) => check.ok));
  const lines = [
    `# Stikprøve: ${chainName}`,
    '',
    `Dato: ${date}  `,
    `Resultat: **${allOk ? 'STEMMER' : 'AFVIGER'}**`,
    '',
    ...description,
    '',
  ];

  for (const result of results) {
    lines.push(`## ${result.name} (${result.centerId})`, '', result.url, '');
    lines.push('| Felt | Scraper | Hjemmeside | Stemmer |', '|---|---|---|---|');
    for (const check of result.checks) {
      const cells = [check.what, show(check.scraper), show(check.website), check.ok ? 'ja' : 'NEJ'];
      lines.push(`| ${cells.join(' | ')} |`);
    }
    lines.push('');
  }
  return { markdown: lines.join('\n'), allOk };
}

// Kører én stikprøve: verify({ http, today }) henter og sammenligner og returnerer
// { markdown, allOk } (fra formatVerification eller Kædens egen). Rapporten skrives i
// docs/<docName> og i loggen. Exit-kode 1, hvis noget afviger, eller stikprøven fejler.
export async function runVerification(docName, verify) {
  try {
    const http = createHttpClient();
    const today = todayInDenmark();
    const { markdown, allOk } = await verify({ http, today });
    await writeFile(new URL(`../docs/${docName}`, import.meta.url), markdown);
    console.log(markdown);
    if (!allOk) process.exitCode = 1;
  } catch (error) {
    console.error('Stikprøven fejlede:', error);
    process.exitCode = 1;
  }
}
