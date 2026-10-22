// Nat-jobbet: kører hver Kædes scraper, tjekker data med sanity-reglerne og skriver alt til
// Realtime Database i én samlet multi-path-opdatering.
//
// Regler (se også sanity.mjs):
// - Et Tilbud eller Center, der fejler sanity-reglerne, skrives ikke; de gamle data beholdes.
// - Giver en Kæde 0 Centre eller mere end 20 % fejl, springes hele Kæden over: intet af den
//   skrives, dens gamle data beholdes, og jobbet ender som fejlet. Andre Kæder skrives stadig.
// - Et Tilbud eller Center, der ikke længere findes på hjemmesiden, beholdes med sit "sidst set"
//   (lastSeen) og tæller missingNights op. Efter 3 nætter i træk fjernes det.
// - Hvert gyldigt Tilbud får et punkt i prishistorikken pr. dag.
//
// Databasen sendes ind udefra ({ ref(path) → { get(), update() } } som i firebase-admin), så
// jobbet kan testes med en falsk database.

import { CENTER_DATA_PATHS } from '../data/centerData.js';
import { centerProblems, chainSkipReason, offerProblems } from './sanity.mjs';

export const PRICE_HISTORY_PATH = 'PriceHistory';

// Dags dato i Danmark som YYYY-MM-DD (svensk datoformat er netop ISO). Jobbet kører om natten
// i UTC, så datoen skal tages i dansk tid for at ramme den rigtige dag.
export const todayInDenmark = (now = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Copenhagen' }).format(now);
export const REMOVE_AFTER_MISSING_NIGHTS = 3;

const { chains: CHAINS, centers: CENTERS, offers: OFFERS } = CENTER_DATA_PATHS;

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
      const offerIssues = offerProblems(offer, previousOffers[offer.id]);
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
      update[`${PRICE_HISTORY_PATH}/${center.id}/${offer.id}/${today}`] = clean({
        standardPrice: offer.standardPrice,
        campaignPrice: offer.campaignPrice,
      });

      const before = previousOffers[offer.id];
      if (!before) {
        report.newOffers.push({ centerId: center.id, offerId: offer.id });
      } else if (
        !sameJson(before.standardPrice, offer.standardPrice) ||
        !sameJson(before.campaignPrice, offer.campaignPrice)
      ) {
        report.priceChanges.push({
          centerId: center.id,
          offerId: offer.id,
          before: {
            standardPrice: before.standardPrice,
            campaignPrice: before.campaignPrice ?? null,
          },
          after: { standardPrice: offer.standardPrice, campaignPrice: offer.campaignPrice ?? null },
        });
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
// today: 'YYYY-MM-DD' (dansk dato). dryRun: læs, men skriv ikke.
// db må være null ved en tør kørsel uden databaseadgang; så regnes databasen som tom.
// Resultat: { ok, update, report }. ok er false, hvis mindst én Kæde blev sprunget over.
export async function runNightlyJob({ db, scrapers, today, dryRun = false }) {
  const previous = db
    ? {
        centers: await readNode(db, CENTERS),
        offers: await readNode(db, OFFERS),
      }
    : { centers: {}, offers: {} };

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

  if (!dryRun && db && Object.keys(update).length > 0) {
    await db.ref().update(update);
  }

  const ok = chains.every((chain) => chain.status === 'written');
  return { ok, update, report: { date: today, dryRun, chains } };
}

const show = (value) => (value == null ? '?' : String(value));

function offerRow({ center, offer, standardPrice, campaignPrice, campaignMonths, ...rest }) {
  const price =
    typeof standardPrice === 'number'
      ? `${standardPrice}`
      : `${show(standardPrice?.under30)} / ${show(standardPrice?.over30)}`;
  const campaign = campaignPrice == null ? '–' : `${campaignPrice} kr i ${campaignMonths} md.`;
  const binding = rest.bindingMonths == null ? '?' : `${rest.bindingMonths} md.`;
  return `| ${center} | ${offer} | ${price} | ${campaign} | ${show(rest.signupFee)} | ${binding} |`;
}

// Rapporten som Markdown, til loggen og GitHub Actions' job-oversigt.
export function formatReport({ date, dryRun, chains }) {
  const lines = [`# Scraper-rapport ${date}${dryRun ? ' (tør kørsel, intet skrevet)' : ''}`, ''];

  for (const chain of chains) {
    const status = chain.status === 'written' ? 'OK' : `SPRUNGET OVER: ${chain.reason}`;
    lines.push(`## ${chain.chainId}: ${status}`, '');
    lines.push(
      `- Centre fundet: ${chain.centersFound}`,
      `- Gyldige Tilbud: ${chain.validOffers}`,
      `- Fejl: ${chain.failures.length}`,
      `- Nye Tilbud: ${chain.newOffers.length}`,
      `- Prisændringer: ${chain.priceChanges.length}`,
      `- Forsvundet (beholdt): ${chain.missing.length}`,
      `- Fjernet efter ${REMOVE_AFTER_MISSING_NIGHTS} nætter: ${chain.removed.length}`,
    );
    for (const failure of chain.failures) {
      const where = [failure.centerId, failure.offerId].filter(Boolean).join(' / ');
      lines.push(`- Fejl i ${where}: ${failure.problems.join('; ')}`);
    }
    for (const warning of chain.warnings) lines.push(`- Advarsel: ${warning}`);
    for (const change of chain.priceChanges) {
      lines.push(
        `- Prisændring ${change.centerId} / ${change.offerId}: ` +
          `${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}`,
      );
    }
    for (const entry of chain.missing) {
      const where = [entry.centerId, entry.offerId].filter(Boolean).join(' / ');
      lines.push(`- Forsvundet ${where} (nat ${entry.missingNights})`);
    }
    for (const entry of chain.removed) {
      lines.push(`- Fjernet ${[entry.centerId, entry.offerId].filter(Boolean).join(' / ')}`);
    }
    lines.push('');
    if (chain.offers.length > 0) {
      lines.push(
        '| Center | Tilbud | Standardpris (u30 / 30+) | Kampagne | Oprettelse | Binding |',
        '|---|---|---|---|---|---|',
      );
      for (const offer of chain.offers) lines.push(offerRow(offer));
      lines.push('');
    }
  }

  return lines.join('\n');
}
