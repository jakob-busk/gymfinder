// Demo af prisfald og push: sænker priserne i ét Center i databasen og kører Prisalarm-delen af
// nat-jobbet for Centrets Kæde, så brugere med en Prisalarm på Centret (eller på Nuværende
// medlemskab) får en rigtig push. Køres med demoPriceDrop.mjs, aldrig af nat-jobbet.
//
// Alle Centrets Tilbud sænkes med samme beløb (Standardpris, Kampagnepris og Makkerpris), men
// højst 30 %. Så holder næste nats rigtige pris sig inden for sanity-reglen om højst ±50 % på
// én nat, og nat-jobbet sætter de rigtige priser tilbage af sig selv. Prishistorikken røres ikke.

import { CENTER_DATA_PATHS, fromDatabase } from '../data/centerData.js';
import { applyUpdate } from './nightlyJob.mjs';
import { USERS_PATH, runPriceAlerts } from './priceAlertPush.mjs';

const { chains: CHAINS, centers: CENTERS, offers: OFFERS } = CENTER_DATA_PATHS;
export const MAX_DROP_SHARE = 0.3;

function lowerPrice(value, amount) {
  if (typeof value === 'number') {
    return Math.max(value - amount, Math.ceil(value * (1 - MAX_DROP_SHARE)));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, price]) => [key, lowerPrice(price, amount)]),
    );
  }
  return value;
}

// Tilbuddet med priser sænket med amount kr/md (højst 30 % pr. pris).
export function lowerOfferPrices(offer, amount) {
  const lowered = { ...offer, standardPrice: lowerPrice(offer.standardPrice, amount) };
  if (offer.campaignPrice != null) lowered.campaignPrice = lowerPrice(offer.campaignPrice, amount);
  if (offer.partnerPrice != null) lowered.partnerPrice = lowerPrice(offer.partnerPrice, amount);
  return lowered;
}

async function readNode(db, path) {
  const snapshot = await db.ref(path).get();
  return snapshot.val() ?? {};
}

// Sænker priserne i centerId med amount kr/md og sender push for de Prisalarmer, det udløser.
// Alt skrives i én opdatering. dryRun: intet skrives og intet sendes; rapporten viser, hvad der
// ville ske. Returnerer { update, report } (report som priceAlerts i nat-jobbets rapport).
export async function runPriceDropDemo({ db, pushClient, centerId, amount, today, dryRun = false }) {
  if (!(amount > 0)) throw new Error('Beløbet skal være et positivt antal kr/md.');
  const tree = {
    [CHAINS]: await readNode(db, CHAINS),
    [CENTERS]: await readNode(db, CENTERS),
    [OFFERS]: await readNode(db, OFFERS),
  };
  const center = tree[CENTERS][centerId];
  if (!center) throw new Error(`Centret ${centerId} findes ikke i databasen.`);
  const offers = Object.entries(tree[OFFERS][centerId] ?? {});
  if (offers.length === 0) throw new Error(`Centret ${centerId} har ingen Tilbud.`);

  const update = {};
  for (const [offerId, offer] of offers) {
    update[`${OFFERS}/${centerId}/${offerId}`] = lowerOfferPrices(offer, amount);
  }

  const after = applyUpdate(tree, update);
  const { chains, centers } = fromDatabase({
    chains: after[CHAINS],
    centers: after[CENTERS],
    offers: after[OFFERS],
  });
  const priceAlerts = await runPriceAlerts({
    users: await readNode(db, USERS_PATH),
    chains,
    centers,
    updatedChainIds: [center.chainId],
    today,
    pushClient: dryRun ? null : pushClient,
  });
  Object.assign(update, priceAlerts.update);

  if (!dryRun) await db.ref().update(update);
  return { update, report: priceAlerts.report };
}
