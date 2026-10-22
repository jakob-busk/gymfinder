// Stikprøve-bevis for PureGym (testlag 3): sammenligner det, scraperen læser, med det, en
// besøgende ser på puregym.dk. Kilderne er uafhængige af parseren:
//   - priserne læses fra de synlige priskort ("429 DKK" overstreget og "321,75 DKK/md.*"), mens
//     parseren bruger settings-JSON'en og det med småt
//   - adresse, navn og koordinater læses fra centersidens JSON-LD, mens parseren bruger
//     /find-center
//   - "Normalpris fra" på /find-center skal være den laveste Standardpris under 30
// Rene funktioner, så sammenligningen kan testes mod gemte svar.

import { distanceKm } from '../data/matchning.js';
import { AGE_GROUPS, decodeEntities, offerNameFrom } from './chains/puregym.mjs';
import { parseAmount } from './chains/amount.mjs';

const AGE_LABELS = { under30: 'under 30', over30: '30+' };

// Koordinater, der ligger under 200 m fra hinanden, er det samme Center.
const MAX_DISTANCE_KM = 0.2;

// De synlige priskort i et ajax-svar: [{ name, standardPrice, currentPrice }]. Med kampagne står
// normalprisen overstreget over den aktuelle pris; ellers er der kun én pris.
export function parseVisibleCards(ajaxText) {
  const insert = JSON.parse(ajaxText).find(
    (command) => command.command === 'insert' && command.selector === '#membership-form-wrapper',
  );
  const html = insert?.data ?? '';
  const starts = [...html.matchAll(/<div id="membership-cards"/g)];
  return starts.map((match, i) => {
    const card = html.slice(match.index, starts[i + 1]?.index ?? html.length);
    const name = card.match(/class="card__title-prefix">\s*([^<]*?)\s*</)?.[1];
    const prefix = card.match(/class="card__price__prefix">([^<]*)</)?.[1];
    const title = card.match(/class="card__price__title">([^<]*)</)?.[1];
    const currentPrice = parseAmount(title);
    return {
      name: offerNameFrom(name ? decodeEntities(name) : undefined),
      standardPrice: prefix ? parseAmount(prefix) : currentPrice,
      currentPrice,
    };
  });
}

// Centersidens JSON-LD (ExerciseGym): navn, adresse og koordinater.
export function parseCenterPage(html) {
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error('Centersiden har ingen JSON-LD');
  const data = JSON.parse(json);
  const { streetAddress, postalCode, addressLocality } = data.address ?? {};
  return {
    name: data.name,
    address: streetAddress && postalCode
      ? `${streetAddress}, ${postalCode} ${addressLocality}`
      : undefined,
    location: data.geo
      ? { latitude: Number(data.geo.latitude), longitude: Number(data.geo.longitude) }
      : undefined,
  };
}

const normalize = (text) => (text ?? '').replace(/[\s,]+/g, ' ').trim().toLowerCase();
const showLocation = (location) =>
  location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : undefined;

// Sammenligner ét Center.
//   listed     Centret fra parseCenterList (med teaserPrices)
//   center     Centret med Tilbud, som scraperen skriver det (buildCenter)
//   responses  de rå ajax-svar { under30, over30 }
//   centerPageHtml  centersiden (/find-center/<slug>)
// Resultat: { centerId, name, url, checks: [{ what, scraper, website, ok }] }.
export function compareCenter({ listed, center, responses, centerPageHtml }) {
  const page = parseCenterPage(centerPageHtml);
  const checks = [];

  checks.push({
    what: 'Adresse',
    scraper: center.address,
    website: page.address,
    ok: normalize(center.address) === normalize(page.address),
  });
  checks.push({
    what: 'Navn',
    scraper: center.name,
    website: page.name,
    ok: center.name === `PureGym ${page.name}`,
  });
  const distance = distanceKm(center.location, page.location);
  checks.push({
    what: 'Koordinater',
    scraper: showLocation(center.location),
    website: showLocation(page.location),
    ok: distance != null && distance <= MAX_DISTANCE_KM,
  });

  const cards = Object.fromEntries(
    AGE_GROUPS.map((ageGroup) => [ageGroup, parseVisibleCards(responses[ageGroup])]),
  );

  for (const offer of center.offers) {
    const visible = AGE_GROUPS.map((ageGroup) =>
      cards[ageGroup].find((card) => card.name === offer.name),
    );
    AGE_GROUPS.forEach((ageGroup, i) => {
      checks.push({
        what: `${offer.name} ${AGE_LABELS[ageGroup]} (kr/md)`,
        scraper: offer.standardPrice[ageGroup],
        website: visible[i]?.standardPrice,
        ok: visible[i] != null && visible[i].standardPrice === offer.standardPrice[ageGroup],
      });
    });

    // Scraperen gemmer Kampagneprisen pr. Aldersgruppe (ét tal, hvis de er ens; se buildOffers).
    const onCampaign = visible.map((card) =>
      card && card.currentPrice < card.standardPrice ? card.currentPrice : null,
    );
    const hasCampaign = onCampaign.every((price) => price != null);
    AGE_GROUPS.forEach((ageGroup, i) => {
      const scraper =
        offer.campaignPrice == null || typeof offer.campaignPrice === 'number'
          ? offer.campaignPrice
          : offer.campaignPrice[ageGroup];
      const website = hasCampaign ? onCampaign[i] : null;
      if (scraper == null && website == null) return;
      checks.push({
        what: `${offer.name} ${AGE_LABELS[ageGroup]} Kampagnepris (kr/md)`,
        scraper,
        website,
        ok: scraper === website,
      });
    });
  }

  // Et synligt priskort, som scraperen ikke har, er en fejl. Undtagelsen er et medlemskab, der
  // kun vises for den ene Aldersgruppe; det springer scraperen bevidst over.
  for (const ageGroup of AGE_GROUPS) {
    const other = AGE_GROUPS.find((group) => group !== ageGroup);
    for (const card of cards[ageGroup]) {
      if (center.offers.some((offer) => offer.name === card.name)) continue;
      const onlyThisAgeGroup = !cards[other].some((candidate) => candidate.name === card.name);
      checks.push({
        what: onlyThisAgeGroup
          ? `${card.name} ${AGE_LABELS[ageGroup]} (findes kun for ${AGE_LABELS[ageGroup]}, ` +
            'springes over)'
          : `${card.name} ${AGE_LABELS[ageGroup]} (kr/md)`,
        scraper: undefined,
        website: card.standardPrice,
        ok: onlyThisAgeGroup,
      });
    }
  }

  // "*Normalpris fra … DKK/md." på /find-center er den laveste Standardpris under 30.
  const lowest = Math.min(...center.offers.map((offer) => offer.standardPrice.under30));
  checks.push({
    what: 'Normalpris fra (find center)',
    scraper: lowest,
    website: listed.teaserPrices?.standardFrom,
    ok: lowest === listed.teaserPrices?.standardFrom,
  });

  return { centerId: center.id, name: center.name, url: listed.pageUrl, checks };
}

export const PUREGYM_VERIFICATION_DESCRIPTION = [
  'Tre tilfældige Centre er hentet fra puregym.dk med samme kald som nat-jobbet (formularen og',
  'én POST pr. Aldersgruppe) plus centersiden. Kolonnen "Scraper" er det, scraperen skriver',
  '(priser fra formularens data og det med småt, adresse fra /find-center), og "Hjemmeside" er',
  'det, en besøgende ser: de synlige priskort (normalpris og intropris) og centersidens',
  'adresse, navn og koordinater (JSON-LD). Kampagneprisen sammenlignes pr. Aldersgruppe.',
  'Genereres med `npm run verify:puregym` i `scraper/`.',
];
