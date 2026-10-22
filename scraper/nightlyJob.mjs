// Nat-jobbet: kører hver Kædes scraper, tjekker data med sanity-reglerne og skriver alt til
// Realtime Database i én samlet multi-path-opdatering.
//
// Regler (se også sanity.mjs):
// - Et Tilbud eller Center, der fejler sanity-reglerne, skrives ikke; de gamle data beholdes.
// - Giver en Kæde 0 Centre eller mere end 20 % fejl, springes hele Kæden over: intet af den
//   skrives, dens gamle data beholdes, og jobbet ender som fejlet. Andre Kæder skrives stadig.
// - Et Tilbud eller Center, der ikke længere findes på hjemmesiden, beholdes med sit "sidst set"
//   (lastSeen) og tæller missingNights op. Efter 3 nætter i træk fjernes det.
// - Hvert gyldigt Tilbud får et punkt i prishistorikken pr. dag (Standardpris, Kampagnepris,
//   Makkerpris og Makkerprisens kampagne).
// - Et Tilbud, som demo-scriptet har sænket (priceDropDemo.mjs), sammenlignes med de rigtige
//   priser fra før demoen, så demoen aldrig får sanity-reglen om ±50 % til at afvise nattens
//   rigtige pris. Nattens Tilbud overskriver demo-markeringen.
// - Efter scraping sendes push for opfyldte Prisalarmer, regnet på nattens nye priser og kun for
//   Kæder, der blev opdateret (se priceAlertPush.mjs). Brugernes nye priser og slettede tokens
//   skrives i samme opdatering som centerdata.
//
// Databasen og push-afsenderen sendes ind udefra ({ ref(path) → { get(), update() } } som i
// firebase-admin, og { send, getReceipts } som i expoPush.mjs), så jobbet kan testes med en falsk
// database og en falsk push-afsender. Rapporten som Markdown bygges i nightlyReport.mjs.

import { CENTER_DATA_PATHS, fromDatabase } from '../data/centerData.js';
import { PUSH_TICKETS_PATH, USERS_PATH, runPriceAlerts } from './priceAlertPush.mjs';
import { centerProblems, chainSkipReason, offerProblems } from './sanity.mjs';

export const PRICE_HISTORY_PATH = 'PriceHistory';

export const REMOVE_AFTER_MISSING_NIGHTS = 3;

const { chains: CHAINS, centers: CENTERS, offers: OFFERS } = CENTER_DATA_PATHS;

// Priserne på et Tilbud, der følges i prishistorikken og nat-rapportens prisændringer.
export const PRICE_FIELDS = [
  'standardPrice',
  'campaignPrice',
  'partnerPrice',
  'partnerCampaignPrice',
];
const PARTNER_PRICE_FIELDS = ['partnerPrice', 'partnerCampaignPrice'];

// Feltet på et Tilbud, som demo-scriptet sætter: { date, realPrices }, hvor realPrices er
// Tilbuddets rigtige priser fra før demoen.
export const DEMO_PRICE_DROP_FIELD = 'demoPriceDrop';

const pricesOf = (offer, fields = PRICE_FIELDS) =>
  Object.fromEntries(fields.map((field) => [field, offer?.[field] ?? null]));

// Tilbuddet fra sidste nat med de rigtige priser, hvis demo-scriptet har sænket dem.
export function withRealPrices(offer) {
  const realPrices = offer?.[DEMO_PRICE_DROP_FIELD]?.realPrices;
  if (!realPrices) return offer;
  const real = { ...offer, ...pricesOf(realPrices) };
  delete real[DEMO_PRICE_DROP_FIELD];
  return real;
}

// Fjerner undefined og null inde i et objekt. (null som værdi i selve opdateringen betyder
// "slet", så det bruges kun bevidst på øverste niveau.)
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child != null)
        .map(([key, child]) => [key, clean(child)]),
    );
  }
  return value;
}

const sameJson = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function readNode(db, path) {
  const snapshot = await db.ref(path).get();
  return snapshot.val() ?? {};
}

// Lægger en multi-path-opdatering oven på en kopi af data, som databasen ville gøre (null
// sletter). Bruges til at regne Prisalarmer på nattens nye priser, før noget er skrevet.
export function applyUpdate(tree, update) {
  const result = structuredClone(tree);
  for (const [path, value] of Object.entries(update)) {
    const keys = path.split('/').filter(Boolean);
    const last = keys.pop();
    let node = result;
    for (const key of keys) {
      if (node[key] == null || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    if (value === null) delete node[last];
    else node[last] = structuredClone(value);
  }
  return result;
}

// Forsvundet Center eller Tilbud: tæl en nat mere, og fjern det efter 3 nætter.
function markMissing(update, path, previous, extraRemovals = []) {
  const missingNights = (previous.missingNights ?? 0) + 1;
  if (missingNights >= REMOVE_AFTER_MISSING_NIGHTS) {
    update[path] = null;
    for (const extra of extraRemovals) update[extra] = null;
    return { missingNights, removed: true };
  }
  update[`${path}/missingNights`] = missingNights;
  return { missingNights, removed: false };
}

// Vurderer én Kædes resultat og lægger dens ændringer i `update`. Returnerer Kædens rapport.
function processChain({ chainId, result, previous, today, update }) {
  const failures = [];
  const accepted = [];

  for (const readError of result.readErrors ?? []) {
    failures.push({ centerId: readError.centerId, problems: [readError.message] });
  }

  let validOffers = 0;
  for (const center of result.centers) {
    const problems = centerProblems(center);
    const offers = center.offers ?? [];
    if (problems.length > 0) {
      // Et ugyldigt Center gør alle dets Tilbud ugyldige.
      const count = Math.max(offers.length, 1);
      for (let i = 0; i < count; i += 1) {
        failures.push({ centerId: center.id, offerId: offers[i]?.id, problems });
      }
      continue;
    }

    const previousOffers = previous.offers[center.id] ?? {};
    const okOffers = [];
    for (const offer of offers) {
      const offerIssues = offerProblems(offer, withRealPrices(previousOffers[offer.id]));
      if (offerIssues.length > 0) {
        failures.push({ centerId: center.id, offerId: offer.id, problems: offerIssues });
      } else {
        okOffers.push(offer);
      }
    }
    validOffers += okOffers.length;
    accepted.push({ center, okOffers });
  }

  const centersFound = result.centers.length + (result.readErrors?.length ?? 0);
  const report = {
    chainId,
    centersFound,
    validOffers,
    failures,
    warnings: result.warnings ?? [],
    priceChanges: [],
    newOffers: [],
    missing: [],
    removed: [],
    offers: [],
  };

  const skipReason = chainSkipReason({ centersFound, failures: failures.length, validOffers });
  if (skipReason) return { ...report, status: 'skipped', reason: skipReason };

  update[`${CHAINS}/${chainId}`] = clean(result.chain);

  const seenCenterIds = new Set([
    ...result.centers.map((center) => center.id),
    ...(result.readErrors ?? []).map((readError) => readError.centerId),
  ]);

  for (const { center, okOffers } of accepted) {
    const { offers, ...centerData } = center;
    update[`${CENTERS}/${center.id}`] = clean({ ...centerData, lastSeen: today });

    const previousOffers = previous.offers[center.id] ?? {};
    for (const offer of okOffers) {
      update[`${OFFERS}/${center.id}/${offer.id}`] = clean({ ...offer, lastSeen: today });
      report.offers.push({
        center: center.name,
        offer: offer.name,
        standardPrice: offer.standardPrice,
        campaignPrice: offer.campaignPrice ?? null,
        campaignMonths: offer.campaignMonths ?? 0,
        signupFee: offer.signupFee,
        bindingMonths: offer.bindingMonths ?? null,
      });
      update[`${PRICE_HISTORY_PATH}/${center.id}/${offer.id}/${today}`] = clean(pricesOf(offer));

      const before = withRealPrices(previousOffers[offer.id]);
      if (!before) {
        report.newOffers.push({ centerId: center.id, offerId: offer.id });
      } else {
        // Makkerpriserne står kun i rapporten for Tilbud, der har (eller havde) en Makkerpris.
        const hasPartnerPrice = [before, offer].some((o) =>
          PARTNER_PRICE_FIELDS.some((field) => o[field] != null),
        );
        const fields = hasPartnerPrice ? PRICE_FIELDS : ['standardPrice', 'campaignPrice'];
        const [beforePrices, afterPrices] = [pricesOf(before, fields), pricesOf(offer, fields)];
        if (!sameJson(beforePrices, afterPrices)) {
          report.priceChanges.push({
            centerId: center.id,
            offerId: offer.id,
            before: beforePrices,
            after: afterPrices,
          });
        }
      }
    }

    // Tilbud, der lå i databasen, men ikke længere står på centersiden. Tilbud, der står der,
    // men fejlede sanity-reglerne, er ikke forsvundet og røres ikke.
    const scrapedOfferIds = new Set((offers ?? []).map((offer) => offer.id));
    for (const [offerId, before] of Object.entries(previousOffers)) {
      if (before == null || scrapedOfferIds.has(offerId)) continue;
      const outcome = markMissing(update, `${OFFERS}/${center.id}/${offerId}`, before);
      const entry = { centerId: center.id, offerId, missingNights: outcome.missingNights };
      (outcome.removed ? report.removed : report.missing).push(entry);
    }
  }

  // Centre fra denne Kæde, der ikke længere står i centerlisten.
  for (const [centerId, before] of Object.entries(previous.centers)) {
    if (before?.chainId !== chainId || seenCenterIds.has(centerId)) continue;
    const outcome = markMissing(update, `${CENTERS}/${centerId}`, before, [
      `${OFFERS}/${centerId}`,
    ]);
    const entry = { centerId, missingNights: outcome.missingNights };
    (outcome.removed ? report.removed : report.missing).push(entry);
  }

  return { ...report, status: 'written' };
}

// scrapers: [{ chainId, scrape: async () => ({ chain, centers, readErrors, warnings }) }]
// today: 'YYYY-MM-DD' (dansk dato). dryRun: læs, men skriv ikke, og send ingen push.
// pushClient: Expo-afsenderen (expoPush.mjs). Uden den sendes ingen push, men rapporten viser,
// hvilke Prisalarmer der er opfyldt.
// db må være null ved en tør kørsel uden databaseadgang; så regnes databasen som tom.
// Resultat: { ok, update, report }. ok er false, hvis mindst én Kæde blev sprunget over.
export async function runNightlyJob({ db, scrapers, today, dryRun = false, pushClient = null }) {
  const previous = db
    ? {
        chains: await readNode(db, CHAINS),
        centers: await readNode(db, CENTERS),
        offers: await readNode(db, OFFERS),
        users: await readNode(db, USERS_PATH),
        pushTickets: await readNode(db, PUSH_TICKETS_PATH),
      }
    : { chains: {}, centers: {}, offers: {}, users: {}, pushTickets: {} };

  const update = {};
  const chains = [];

  for (const { chainId, scrape } of scrapers) {
    let result;
    try {
      result = await scrape();
    } catch (error) {
      chains.push({
        chainId,
        status: 'skipped',
        reason: `Kæden kunne ikke hentes: ${error.message}`,
        centersFound: 0,
        validOffers: 0,
        failures: [],
        warnings: [],
        priceChanges: [],
        newOffers: [],
        missing: [],
        removed: [],
        offers: [],
      });
      continue;
    }
    chains.push(processChain({ chainId, result, previous, today, update }));
  }

  // Prisalarmer regnes på nattens data (gamle data + opdateringen), men kun Kæder, der blev
  // skrevet, kan udløse dem.
  const after = applyUpdate(
    { [CHAINS]: previous.chains, [CENTERS]: previous.centers, [OFFERS]: previous.offers },
    update,
  );
  const centerData = fromDatabase({
    chains: after[CHAINS],
    centers: after[CENTERS],
    offers: after[OFFERS],
  });
  const priceAlerts = await runPriceAlerts({
    users: previous.users,
    chains: centerData.chains,
    centers: centerData.centers,
    updatedChainIds: chains.filter((chain) => chain.status === 'written').map((c) => c.chainId),
    today,
    pushClient: dryRun ? null : pushClient,
    pendingTickets: previous.pushTickets,
  });
  Object.assign(update, priceAlerts.update);

  if (!dryRun && db && Object.keys(update).length > 0) {
    await db.ref().update(update);
  }

  const ok = chains.every((chain) => chain.status === 'written');
  return {
    ok,
    update,
    report: { date: today, dryRun, chains, priceAlerts: priceAlerts.report },
  };
}
