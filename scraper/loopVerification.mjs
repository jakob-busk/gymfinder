// Stikprøve-bevis for LOOP (testlag 3): sammenligner det, scraperen skriver, med det, en
// besøgende ser. Scraperen læser alt fra centerlistens `var locations`; her læses det
// uafhængigt af den:
//   - centersiden: den synlige adresse, åbningstiden ("Åbent alle dage fra 05 – 22") og hvilke
//     priskort siden viser
//   - priskortenes egne tekster, som siden henter fra admin-ajax (loop_get_subscription):
//     "Derefter: 289 kr. pr. 30 dage", "Træn indtil den 31.12.26", kampagnebeløbet,
//     administrationsgebyret og minimumsprisen
//   - Ældre Sagens egen side om LOOP-rabatten (procent og Oprettelsesgebyr)
// Rene funktioner, så sammenligningen kan testes mod gemte sider.

import { decodeEntities, familyPairingKey } from './chains/loop.mjs';

export const LOOP_AJAX_URL = 'https://loopfitness.dk/wp-admin/admin-ajax.php';
export const AELDRE_SAGEN_LOOP_URL =
  'https://www.aeldresagen.dk/tilbud-og-rabatter/samarbejdspartnere/motion-og-fitness/' +
  'loop-fitness/offers/rabat-paa-fitness-loop-fitness';

const textOf = (html) =>
  decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

// "289", "245,65", "4.193" → tal; ellers null.
function danishNumber(text) {
  const match = String(text ?? '').match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/);
  return match ? Number(match[0].replace(/\./g, '').replace(',', '.')) : null;
}

// ---------- Centersiden ----------

// { address, hoursText, open24h, priceCards: [{ centerId, subscription }], nonce }
export function parseVisibleCenterPage(html) {
  const addressBlock = html.match(/<p itemprop="address"[^>]*>([\s\S]*?)<\/p>/)?.[1];
  const part = (name) =>
    addressBlock?.match(new RegExp(`itemprop="${name}">([^<]*)<`))?.[1]?.trim().replace(/,$/, '');
  const street = part('streetAddress');
  const postalCode = part('postalCode');
  const locality = part('addressLocality');
  const address =
    street && postalCode && locality
      ? decodeEntities(`${street}, ${postalCode} ${locality}`)
      : undefined;

  const headline = html.match(/class="loop-center-hours-headline"[^>]*>([\s\S]*?)<\/h2>/)?.[1];
  const hoursText = headline ? textOf(headline) : undefined;
  // "Åbent alle dage fra 05 – 22": døgnåbent kun ved 00 – 24.
  const hours = hoursText?.match(/(\d{1,2})(?:[:.](\d{2}))?\s*[–-]\s*(\d{1,2})(?:[:.](\d{2}))?/);
  const open24h = hours ? Number(hours[1]) === 0 && Number(hours[3]) >= 24 : undefined;

  const priceCards = [
    ...html.matchAll(/data-center-id="([^"]*)" data-subscription="([^"]*)"/g),
  ].map(([, centerId, subscription]) => ({ centerId, subscription: decodeEntities(subscription) }));

  const nonce = html.match(/var price_card_ajax = \{[^}]*"nonce":"([a-f0-9]+)"/)?.[1];
  return { address, hoursText, open24h, priceCards, nonce };
}

// ---------- Priskortets tekster (admin-ajax) ----------

// Svaret fra loop_get_subscription som de tal, priskortet viser.
export function parseSubscriptionAnswer(json) {
  const answer = typeof json === 'string' ? JSON.parse(json) : json;
  if (!answer?.success) {
    return { found: false, message: answer?.data?.message ?? 'Ukendt svar' };
  }
  const { prices = {}, texts = {}, subscription = {} } = answer.data;
  const until = texts.trial_text?.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  const year = until ? (until[3].length === 2 ? 2000 + Number(until[3]) : Number(until[3])) : null;

  return {
    found: true,
    name: subscription.name?.trim(),
    family: Number(subscription.family_members) > 0,
    regularPrice: danishNumber(texts.regular_price_text) ?? prices.regular?.full_price ?? null,
    periodDays: Number(texts.regular_price_text?.match(/pr\. (\d+) dage/)?.[1]) || null,
    trialPrice: answer.data.trial ? (prices.trial?.price ?? null) : null,
    trialUntil: until
      ? `${year}-${until[2].padStart(2, '0')}-${until[1].padStart(2, '0')}`
      : null,
    adminFee: danishNumber(texts.legal_text?.match(/administrationsgebyr på ([\d.,]+) kr/)?.[1]),
    minimumPrice: danishNumber(texts.signup_fee_text?.match(/Minimumspris[^:]*: ([\d.,]+)/)?.[1]),
  };
}

// ---------- Ældre Sagens side ----------

// { percentOff, signupFee, adminFee } fra afsnittet "Rabat".
export function parseAeldreSagenOffer(html) {
  const section = html.match(/<h2>Rabat<\/h2>([\s\S]*?)(?:<h2>|$)/)?.[1];
  const text = section ? textOf(section) : '';
  return {
    percentOff: danishNumber(text.match(/([\d,]+)\s*%/)?.[1]),
    signupFee: danishNumber(text.match(/Oprettelse ([\d.,]+) kr/)?.[1]),
    adminFee: danishNumber(text.match(/administrationsgebyr på ([\d.,]+) kr/)?.[1]),
  };
}

// ---------- Sammenligning ----------

const normalizeAddress = (address) => (address ?? '').replace(/[\s,]+/g, ' ').trim().toLowerCase();
const yesNo = (value) => (value === true ? 'ja' : value === false ? 'nej' : undefined);
const same = (a, b) => a != null && b != null && a === b;

// Abonnementets navn, som det står i Tilbuddets tilmeldingslink (= priskortets
// data-subscription).
const subscriptionOf = (offer) => new URL(offer.signupUrl).searchParams.get('subscription');

// Hele kampagnebeløbet, som scraperen har fordelt på perioder (fx 2 × 50 = 100 kr).
const campaignTotal = (offer) =>
  offer.campaignPrice == null ? null : Math.round(offer.campaignPrice * offer.campaignMonths);

function singleCardChecks(offer, answer) {
  const label = offer.name;
  const firstPayment = campaignTotal(offer) ?? offer.standardPrice;
  const minimumPrice = offer.signupFee + firstPayment + offer.standardPrice + offer.adminFee;
  // Priskortet viser også en "kampagne" på almindelige abonnementer (første betaling = pris);
  // kun en lavere første betaling er en kampagne.
  const isCampaign = answer.trialPrice != null && answer.trialPrice < answer.regularPrice;
  const siteCampaign = isCampaign ? answer.trialPrice : null;
  const siteEndDate = isCampaign ? answer.trialUntil : null;
  return [
    {
      what: `${label}: Standardpris (kr pr. 30 dage)`,
      scraper: offer.standardPrice,
      website: answer.regularPrice,
      ok: same(offer.standardPrice, answer.regularPrice),
    },
    {
      what: `${label}: betaling pr. antal dage`,
      scraper: offer.billingIntervalDays,
      website: answer.periodDays,
      ok: same(offer.billingIntervalDays, answer.periodDays),
    },
    {
      what: `${label}: Admingebyr (kr)`,
      scraper: offer.adminFee,
      website: answer.adminFee,
      ok: same(offer.adminFee, answer.adminFee),
    },
    {
      what: `${label}: kampagne i alt (kr)`,
      scraper: campaignTotal(offer) ?? undefined,
      website: siteCampaign ?? undefined,
      ok: campaignTotal(offer) === siteCampaign,
    },
    {
      what: `${label}: kampagnen slutter`,
      scraper: offer.campaignEndDate,
      website: siteEndDate ?? undefined,
      ok: (offer.campaignEndDate ?? null) === siteEndDate,
    },
    {
      // Oprettelsesgebyr plus første og anden betaling: 0 + 100 + 289 + 10 = 399.
      what: `${label}: minimumspris (kr)`,
      scraper: minimumPrice,
      website: answer.minimumPrice,
      ok: same(minimumPrice, answer.minimumPrice),
    },
  ];
}

// Familiemedlemskabet: scraperen gemmer Makkerprisen pr. person; husstandens pris er
// 2 × (Makkerpris + Admingebyr) − Admingebyr.
function familyCardChecks(offer, answer) {
  const household =
    offer?.partnerPrice == null
      ? undefined
      : Math.round((2 * (offer.partnerPrice + offer.adminFee) - offer.adminFee) * 100) / 100;
  return [
    {
      what: 'Familie (Træn med en makker): pris pr. husstand (kr pr. 30 dage)',
      scraper: household,
      website: answer.regularPrice,
      ok: same(household, answer.regularPrice),
    },
  ];
}

// Sammenligner ét Center. `center` er Centret, som scrapeLoop gav det; `answers` er
// priskort-navn → svar fra loop_get_subscription.
// Resultat: { centerId, name, url, checks: [{ what, scraper, website, ok }] }.
export function compareLoopCenter(center, centerHtml, answers) {
  const page = parseVisibleCenterPage(centerHtml);
  const checks = [
    {
      what: 'Adresse',
      scraper: center.address,
      website: page.address,
      ok: normalizeAddress(center.address) === normalizeAddress(page.address),
    },
    {
      what: 'Døgnåbent',
      scraper: yesNo(center.facilities.open24h),
      website: page.hoursText ? `${yesNo(page.open24h)} (${page.hoursText})` : undefined,
      ok: center.facilities.open24h === page.open24h,
    },
  ];

  // Børnemedlemskabet (kids) er ikke et Tilbud i GymFinder.
  const cards = page.priceCards.filter((card) => card.subscription.toLowerCase() !== 'kids');
  for (const card of cards) {
    const answer = parseSubscriptionAnswer(answers[card.subscription]);
    if (!answer.found) {
      checks.push({
        what: `Priskort "${card.subscription}"`,
        scraper: undefined,
        website: answer.message,
        ok: false,
      });
      continue;
    }
    const key = familyPairingKey(card.subscription);
    const offer = center.offers.find(
      (candidate) => familyPairingKey(subscriptionOf(candidate)) === key,
    );
    if (!offer) {
      checks.push({
        what: `Priskort "${card.subscription}"`,
        scraper: undefined,
        website: answer.regularPrice,
        ok: false,
      });
      continue;
    }
    const cardChecks = answer.family ? familyCardChecks : singleCardChecks;
    checks.push(...cardChecks(offer, answer));
  }

  return { centerId: center.id, name: center.name, url: center.signupUrl, checks };
}

// Kædens Ældre Sagen-rabat mod Ældre Sagens egen side.
export function compareAeldreSagen(chain, html) {
  const site = parseAeldreSagenOffer(html);
  const discount = chain.discounts.find((candidate) => candidate.discountGroup === 'aeldreSagen');
  return {
    centerId: 'Kæden',
    name: 'Ældre Sagen-rabat',
    url: AELDRE_SAGEN_LOOP_URL,
    checks: [
      {
        what: 'Rabat (%)',
        scraper: discount?.percentOff,
        website: site.percentOff,
        ok: same(discount?.percentOff, site.percentOff),
      },
      {
        what: 'Oprettelsesgebyr med Rabat (kr)',
        scraper: discount?.signupFee,
        website: site.signupFee,
        ok: same(discount?.signupFee, site.signupFee),
      },
    ],
  };
}

const show = (value) => (value == null ? '–' : String(value));

// Kort resumé af den tørre nat-kørsel på de samme data (testlag 2), når det er givet:
// { status, centersFound, validOffers, failures: [...], warnings: [...] }.
function liveRunLines(liveRun) {
  if (!liveRun) return [];
  const lines = [
    '## Live-kørsel (tør, intet skrevet)',
    '',
    `- Status: ${liveRun.status === 'written' ? 'OK' : `SPRUNGET OVER: ${liveRun.reason}`}`,
    `- Centre fundet: ${liveRun.centersFound}`,
    `- Gyldige Tilbud efter sanity-reglerne: ${liveRun.validOffers}`,
    `- Fejl: ${liveRun.failures.length}`,
    `- Advarsler: ${liveRun.warnings.length}`,
  ];
  for (const failure of liveRun.failures) {
    const where = [failure.centerId, failure.offerId].filter(Boolean).join(' / ');
    lines.push(`- Fejl i ${where}: ${failure.problems.join('; ')}`);
  }
  for (const warning of liveRun.warnings) lines.push(`- Advarsel: ${warning}`);
  lines.push('');
  return lines;
}

export function formatLoopVerification({ date, results, liveRun }) {
  const allOk =
    results.every((result) => result.checks.every((check) => check.ok)) &&
    (liveRun == null || (liveRun.status === 'written' && liveRun.failures.length === 0));
  const lines = [
    '# Stikprøve: LOOP',
    '',
    `Dato: ${date}  `,
    `Resultat: **${allOk ? 'STEMMER' : 'AFVIGER'}**`,
    '',
    'Tre tilfældige Centre er hentet fra loopfitness.dk. Kolonnen "Scraper" er det, nat-jobbet',
    'skriver (læst fra centerlistens `var locations`), og "Hjemmeside" er det, en besøgende ser:',
    'adressen og åbningstiden på centersiden og teksterne på centersidens priskort (som siden selv',
    'henter fra LOOPs admin-ajax). Ældre Sagen-rabatten tjekkes mod Ældre Sagens egen side.',
    'LOOP opkræver pr. 30 dage; kampagnen "100 kr. resten af året" fordeles af scraperen på de',
    'hele 30-dages-perioder til slutdatoen, så "kampagne i alt" sammenligner hele beløbet.',
    'Genereres med `npm run verify:loop` i `scraper/`.',
    '',
    ...liveRunLines(liveRun),
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
