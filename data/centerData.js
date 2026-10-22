// Centerdata i Realtime Database: oversætter mellem Matchnings domænemodel (Kæder, Centre med
// Tilbud) og den form, data har i databasen.
//
// Ren JavaScript uden React Native, Expo eller Firebase, så den kan bruges både i appen og af
// seed-scriptet/nat-jobbet i scraper/.
//
// Databasens form (rod-noder i PascalCase, streng-id'er som nøgler):
//
//   Chains/<chainId>             = Kæde   { id, name, website, discounts: [Rabat] }
//   Centers/<centerId>           = Center uden Tilbud { id, chainId, name, address, location, ... }
//   Offers/<centerId>/<offerId>  = Tilbud { id, name, subscriptionType, standardPrice, ... }
//
// Tilbud ligger i deres egen rod-node, så nat-jobbet kan opdatere priser og "sidst set" pr.
// Tilbud uden at røre Centrets øvrige felter.
//
// Realtime Database gemmer hverken null eller tomme lister. Når data læses, sættes de manglende
// felter derfor tilbage til Matchnings standardværdier (fx null = ukendt, [] = ingen Rabatter).

import { FACILITY_FILTERS } from './matchning.js';

export const CENTER_DATA_PATHS = {
  chains: 'Chains',
  centers: 'Centers',
  offers: 'Offers',
};

// Lister kommer tilbage som array, men et array med huller eller et objekt med tal-nøgler
// forekommer også (fx hvis et element er slettet i konsollen).
function toList(value) {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : Object.values(value);
  return items.filter((item) => item != null);
}

function normalizeChain(id, chain) {
  return {
    ...chain,
    id,
    discounts: toList(chain.discounts),
  };
}

function normalizeOffer(id, offer) {
  return {
    ...offer,
    id,
    campaignPrice: offer.campaignPrice ?? null,
    campaignMonths: offer.campaignMonths ?? 0,
    signupFee: offer.signupFee ?? 0,
    adminFee: offer.adminFee ?? 0,
    // Manglende Binding er ukendt ("Ikke oplyst"), ikke 0.
    bindingMonths: offer.bindingMonths ?? null,
    partnerPrice: offer.partnerPrice ?? null,
  };
}

// Manglende facilitet er ukendt ("Ikke oplyst"); kun false betyder nej.
function normalizeFacilities(facilities) {
  const known = Object.fromEntries(FACILITY_FILTERS.map((key) => [key, null]));
  return { ...known, ...facilities };
}

function normalizeCenter(id, center, offersById) {
  return {
    ...center,
    id,
    facilities: normalizeFacilities(center.facilities),
    // Manglende maskinliste er ukendt ("Ikke oplyst").
    machines: center.machines == null ? null : toList(center.machines),
    offers: Object.entries(offersById ?? {})
      .filter(([, offer]) => offer != null)
      .map(([offerId, offer]) => normalizeOffer(offerId, offer)),
  };
}

// Databasens tre rod-noder → { chains, centers } i Matchnings form.
// Centre uden kendt Kæde eller uden placering springes over, da de ikke kan prissættes eller
// vises på kortet.
export function fromDatabase({ chains, centers, offers } = {}) {
  const chainList = Object.entries(chains ?? {})
    .filter(([, chain]) => chain != null)
    .map(([id, chain]) => normalizeChain(id, chain));
  const chainIds = new Set(chainList.map((chain) => chain.id));

  const centerList = Object.entries(centers ?? {})
    .filter(([, center]) => center != null && center.location != null)
    .filter(([, center]) => chainIds.has(center.chainId))
    .map(([id, center]) => normalizeCenter(id, center, offers?.[id]));

  return { chains: chainList, centers: centerList };
}

// { chains, centers } i Matchnings form → databasens tre rod-noder.
export function toDatabase({ chains, centers }) {
  const offers = {};
  const centersById = {};

  for (const { offers: centerOffers, ...center } of centers) {
    centersById[center.id] = center;
    offers[center.id] = Object.fromEntries(
      (centerOffers ?? []).map((offer) => [offer.id, offer]),
    );
  }

  return {
    chains: Object.fromEntries(chains.map((chain) => [chain.id, chain])),
    centers: centersById,
    offers,
  };
}

// Én samlet multi-path-opdatering, der lægger de håndindtastede Kæder, Centre og Tilbud i
// databasen. Hver Kæde, hvert Center og hvert Centers Tilbud overskrives helt på sin egen sti,
// så opdateringen kan køres igen og igen med samme resultat (idempotent). Andre Kæder og
// brugerdata røres ikke.
export function buildSeedUpdate({ chains, centers }) {
  const tree = toDatabase({ chains, centers });
  const update = {};

  for (const [id, chain] of Object.entries(tree.chains)) {
    update[`${CENTER_DATA_PATHS.chains}/${id}`] = chain;
  }
  for (const [id, center] of Object.entries(tree.centers)) {
    update[`${CENTER_DATA_PATHS.centers}/${id}`] = center;
  }
  for (const [centerId, centerOffers] of Object.entries(tree.offers)) {
    update[`${CENTER_DATA_PATHS.offers}/${centerId}`] = centerOffers;
  }

  // Realtime Database afviser undefined; JSON-runden fjerner det og efterlader rene data.
  return JSON.parse(JSON.stringify(update));
}

// Vælger hvilke centerdata appen viser. Er databasen tom (ikke seedet endnu), ikke konfigureret
// eller utilgængelig, vises de håndindtastede eksempeldata, så appen altid har noget at vise.
export function resolveCenterData({ database, sampleData }) {
  const fromDb = database ? fromDatabase(database) : null;

  if (fromDb && fromDb.centers.length > 0) {
    return { ...fromDb, source: 'firebase' };
  }
  return { chains: sampleData.chains, centers: sampleData.centers, source: 'sample' };
}
