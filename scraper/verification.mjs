// Stikprøve-bevis (testlag 3): sammenligner det, scraperen læser, med det, en besøgende ser
// på sats.dk. Priserne læses her uafhængigt af parseren, direkte fra de synlige priskort i
// HTML'en (ikke fra data-props), og adressen fra den synlige adresselinje øverst på siden.
// Rene funktioner, så sammenligningen kan testes mod gemte sider.

import { parseCenterPage, parseDanishNumber } from './chains/sats.mjs';

const decodeEntities = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"');

// De priskort, siden viser uden klik (Voksen under 30): [{ membershipId, name, price }].
export function parseVisiblePricingCards(html) {
  const cards = [];
  const cardPattern = /<div class="pricing-card[^"]*" data-id="([^"]+)"/g;
  const starts = [...html.matchAll(cardPattern)];

  starts.forEach((match, i) => {
    const block = html.slice(match.index, starts[i + 1]?.index ?? html.length);
    const name = block.match(/pricing-card__name-wrapper"><div[^>]*>([^<]+)</)?.[1];
    const price = block.match(/pricing-card__price"><div[^>]*>([^<]+)</)?.[1];
    cards.push({
      membershipId: match[1],
      name: name ? decodeEntities(name.trim()) : undefined,
      price: parseDanishNumber(price),
    });
  });
  return cards;
}

// Den synlige adresselinje øverst på centersiden (linket til kortet).
export function parseVisibleAddress(html) {
  const inner = html.match(/href="#club-page-map">([\s\S]*?)<\/a>/)?.[1];
  if (inner == null) return undefined;
  const text = inner.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '');
  return decodeEntities(text).replace(/\s+/g, ' ').trim() || undefined;
}

const normalizeAddress = (address) => (address ?? '').replace(/[\s,]+/g, ' ').trim().toLowerCase();

// Sammenligner ét Center. `listed` er Centret fra centerlisten (som parseCenterList giver det).
// Resultat: { centerId, name, checks: [{ what, scraper, website, ok }] }.
export function compareCenter(listed, centerHtml) {
  const page = parseCenterPage(centerHtml);
  const cards = parseVisiblePricingCards(centerHtml);
  const checks = [];

  // Samme valg som scrapeSats: centersidens adresse, ellers listens.
  const scraperAddress = page.address ?? listed.address;
  const visibleAddress = parseVisibleAddress(centerHtml);
  checks.push({
    what: 'Adresse',
    scraper: scraperAddress,
    website: visibleAddress,
    ok: normalizeAddress(scraperAddress) === normalizeAddress(visibleAddress),
  });

  for (const offer of page.offers) {
    const card = cards.find((candidate) => candidate.membershipId === `${offer.key}_U30`);
    checks.push({
      what: `${offer.name} under 30 (kr/md)`,
      scraper: offer.standardPrice.under30,
      website: card?.price,
      ok: card != null && card.price === offer.standardPrice.under30 && card.name === offer.name,
    });
  }

  // Et synligt priskort, som parseren ikke fandt, er også en fejl.
  for (const card of cards) {
    const known = page.offers.some((offer) => `${offer.key}_U30` === card.membershipId);
    if (!known) {
      checks.push({
        what: `${card.name} under 30 (kr/md)`,
        scraper: undefined,
        website: card.price,
        ok: false,
      });
    }
  }

  return { centerId: listed.id, name: listed.name, url: listed.signupUrl, checks };
}

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

export function formatVerification({ chainName, date, results }) {
  const allOk = results.every((result) => result.checks.every((check) => check.ok));
  const lines = [
    `# Stikprøve: ${chainName}`,
    '',
    `Dato: ${date}  `,
    `Resultat: **${allOk ? 'STEMMER' : 'AFVIGER'}**`,
    '',
    'Tre tilfældige Centre er hentet fra hjemmesiden. Kolonnen "Scraper" er det, scraperen læser',
    '(sidernes data-props), og "Hjemmeside" er det, en besøgende ser: priserne på de synlige',
    'priskort og adresselinjen øverst på centersiden. Genereres med',
    '`npm run verify` i `scraper/`.',
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
