// Stikprøve-bevis for Fitness X (testlag 3). Centersiderne viser ingen priser i HTML'en (de
// tegnes i browseren ud fra sj_ajax_object), så scraperens tal sammenlignes med det, en besøgende
// kan læse på Kædens prisliste (/oevrige-priser/), og adressen med adresselinjen på centersiden.
// Rene funktioner, så sammenligningen kan testes mod gemte sider.

import {
  FITNESSX_SIGNUP_URL,
  buildOffer,
  listPriceFor,
  offersForCenter,
  parseCenterPage,
} from './chains/fitnessx.mjs';
import { centerProblems, offerProblems } from './sanity.mjs';

const AGE_GROUPS = [
  ['under30', 'under 30'],
  ['over30', '30+'],
];

const normalizeAddress = (address) => (address ?? '').replace(/[\s,]+/g, ' ').trim().toLowerCase();

// Sammenligner ét Center. `listed` er Centret fra centerlisten, `priceList` er parsePriceList.
// Resultat: { centerId, name, url, checks: [{ what, scraper, website, ok }] }.
export function compareFitnessxCenter(listed, centerHtml, priceList) {
  const page = parseCenterPage(centerHtml);
  const { offers } = offersForCenter(page.ajaxObject, page.guid);
  const checks = [];

  checks.push({
    what: 'Adresse',
    scraper: listed.address,
    website: page.address,
    ok: normalizeAddress(listed.address) === normalizeAddress(page.address),
  });
  if (listed.guid) {
    checks.push({
      what: 'Centersidens GUID',
      scraper: listed.guid,
      website: page.guid,
      ok: listed.guid === page.guid,
    });
  }

  const compare = (what, scraper, key) => {
    const website = listPriceFor(priceList, key);
    checks.push({ what, scraper, website, ok: website != null && website === scraper });
  };

  for (const offer of offers) {
    if (offer.category == null) {
      // Åbningstilbud og lignende står ikke på prislisten.
      checks.push({
        what: `${offer.name} (kr/md)`,
        scraper: JSON.stringify(offer.standardPrice),
        website: 'står ikke på prislisten',
        ok: true,
      });
      continue;
    }
    if (!offer.partnerOnly) {
      for (const [ageGroup, label] of AGE_GROUPS) {
        compare(`${offer.name}, ${label} (kr/md)`, offer.standardPrice[ageGroup], {
          category: offer.category,
          reformer: offer.reformer,
          partner: false,
          special: offer.special,
          ageGroup,
        });
      }
    }
    if (offer.partner) {
      const { partner } = offer;
      for (const [ageGroup, label] of AGE_GROUPS) {
        const what = `${offer.name} med Træningsven, ${label}, for to (kr/md)`;
        compare(what, partner.total[ageGroup], {
          category: partner.category,
          reformer: partner.reformer,
          partner: true,
          special: partner.special,
          ageGroup,
        });
      }
    }
  }

  const first = offers[0];
  for (const [fee, label] of [
    ['signupFee', 'Oprettelsesgebyr (kr)'],
    ['adminFee', 'Admingebyr (kr/md)'],
  ]) {
    checks.push({
      what: label,
      scraper: first?.[fee],
      website: priceList[fee],
      ok: first != null && offers.every((offer) => offer[fee] === priceList[fee]),
    });
  }

  return { centerId: listed.id, name: listed.name, url: listed.signupUrl, checks };
}

// Hele Kæden ud fra de hentede centersider: alle sider har alle Kædens medlemskaber, så hvert
// Center med GUID i centerlisten kan prissættes og sanity-tjekkes uden flere kald.
// `pages`: [{ listed, html }]. Resultat: { centers, offers, failures: [{ centerId, problems }],
// unresolved: [centerId] } (unresolved = intet GUID i listen og ikke blandt de hentede sider).
export function checkWholeChain(listedCenters, pages, today) {
  const memberships = new Map();
  const guidById = new Map();
  for (const { listed, html } of pages) {
    const page = parseCenterPage(html);
    guidById.set(listed.id, page.guid);
    for (const membership of page.ajaxObject.medlemskaber) {
      memberships.set(membership.id, membership);
    }
  }
  const ajaxObject = { medlemskaber: [...memberships.values()] };

  const summary = { centers: 0, offers: 0, failures: [], unresolved: [] };
  for (const listed of listedCenters) {
    const guid = guidById.get(listed.id) ?? listed.guid;
    if (!guid) {
      summary.unresolved.push(listed.id);
      continue;
    }
    const { guid: _guid, ...center } = listed;
    center.signupUrl ??= FITNESSX_SIGNUP_URL;
    const offers = offersForCenter(ajaxObject, guid).offers.map((draft) =>
      buildOffer(center, draft, { today }),
    );
    summary.centers += 1;
    const problems = [...centerProblems(center)];
    if (offers.length === 0) problems.push('Centret har ingen Tilbud');
    for (const offer of offers) {
      const offerIssues = offerProblems(offer);
      if (offerIssues.length === 0) summary.offers += 1;
      else problems.push(...offerIssues.map((problem) => `${offer.name}: ${problem}`));
    }
    if (problems.length > 0) summary.failures.push({ centerId: listed.id, problems });
  }
  return summary;
}

const show = (value) => (value == null ? '–' : String(value));

export function formatFitnessxVerification({ date, results, wholeChain }) {
  const allOk =
    results.every((result) => result.checks.every((check) => check.ok)) &&
    wholeChain.failures.length === 0;
  const lines = [
    '# Stikprøve: Fitness X',
    '',
    `Dato: ${date}  `,
    `Resultat: **${allOk ? 'STEMMER' : 'AFVIGER'}**`,
    '',
    'Tre tilfældige Centre er hentet fra fitnessx.dk. Centersiderne viser ingen priser i selve',
    'HTML\'en (de tegnes i browseren), så kolonnen "Hjemmeside" er det, en besøgende kan læse på',
    'Kædens prisliste (https://fitnessx.dk/oevrige-priser/) for Centrets Kategori, og adressen er',
    'adresselinjen øverst på centersiden. "Scraper" er det, scraperen læser i sidens',
    '`sj_ajax_object`. Genereres med `npm run verify:fitnessx` i `scraper/` (5 kald: centerliste,',
    'prisliste og tre centersider).',
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

  lines.push(
    '## Hele Kæden (live, uden at skrive)',
    '',
    'Alle centersider har alle Kædens medlemskaber, så hvert Center i centerlisten er prissat ud',
    'fra de tre hentede sider og tjekket med sanity-reglerne.',
    '',
    `- Centre prissat: ${wholeChain.centers}`,
    `- Gyldige Tilbud: ${wholeChain.offers}`,
    `- Sanity-fejl: ${wholeChain.failures.length}`,
  );
  for (const failure of wholeChain.failures) {
    lines.push(`  - ${failure.centerId}: ${failure.problems.join('; ')}`);
  }
  lines.push(
    `- Ikke prissat (intet GUID i centerlisten, og siden er ikke hentet): ` +
      `${wholeChain.unresolved.length > 0 ? wholeChain.unresolved.join(', ') : 'ingen'}`,
    '',
  );

  return { markdown: lines.join('\n'), allOk };
}
