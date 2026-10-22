// Demo af prisfald og push: sænker priserne i ét Center i databasen og kører Prisalarm-delen af
// nat-jobbet for Centrets Kæde, så brugere med en Prisalarm på Centret (eller på Nuværende
// medlemskab) får en rigtig push. Køres med demoPriceDrop.mjs, aldrig af nat-jobbet.
//
// Alle Centrets Tilbud sænkes med samme beløb (Standardpris, Kampagnepris og Makkerpris med
// kampagne), men højst 30 %. Prishistorikken røres ikke.
//
// Hvert sænket Tilbud markeres med de rigtige priser (`demoPriceDrop`), og et Center med en
// markering kan ikke sænkes igen. Ellers ville to demoer i træk give 49 % af den rigtige pris,
// og næste nats rigtige pris (+104 %) ville blive afvist af sanity-reglen om højst ±50 % på én
// nat, så de falske priser blev stående. Nat-jobbet sammenligner med de rigtige priser fra
// markeringen og overskriver Tilbuddet uden markering, så Centret kan demo-sænkes igen bagefter.

import { CENTER_DATA_PATHS, fromDatabase } from '../data/centerData.js';
import { DEMO_PRICE_DROP_FIELD, PRICE_FIELDS, applyUpdate } from './nightlyJob.mjs';
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

// Tilbuddet med priser sænket med amount kr/md (højst 30 % pr. pris). Uden `today` markeres
// Tilbuddet ikke.
export function lowerOfferPrices(offer, amount, today) {
  const lowered = { ...offer, standardPrice: lowerPrice(offer.standardPrice, amount) };
  if (offer.campaignPrice != null) lowered.campaignPrice = lowerPrice(offer.campaignPrice, amount);
  if (offer.partnerPrice != null) lowered.partnerPrice = lowerPrice(offer.partnerPrice, amount);
  if (offer.partnerCampaignPrice != null) {
    lowered.partnerCampaignPrice = lowerPrice(offer.partnerCampaignPrice, amount);
  }
  if (today) {
    const realPrices = PRICE_FIELDS.filter((field) => offer[field] != null).map((field) => [
      field,
      offer[field],
    ]);
    lowered[DEMO_PRICE_DROP_FIELD] = { date: today, realPrices: Object.fromEntries(realPrices) };
  }
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
  const lowered = offers.find(([, offer]) => offer?.[DEMO_PRICE_DROP_FIELD]);
  if (lowered) {
    throw new Error(
      `Centret ${centerId} blev demo-sænket ${lowered[1][DEMO_PRICE_DROP_FIELD].date ?? ''} og ` +
        'har ikke fået rigtige priser igen. Vent til nat-jobbet har kørt.',
    );
  }

  const update = {};
  for (const [offerId, offer] of offers) {
    update[`${OFFERS}/${centerId}/${offerId}`] = lowerOfferPrices(offer, amount, today);
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
