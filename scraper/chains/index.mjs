// De Kæder, der scrapes hver nat. En Kæde kommer først på listen, når dens parser har bestået
// alle tre testlag (fixture-tests, live-kørsel og stikprøve i docs/). Indtil da bruger den de
// håndindtastede data fra data/const.js, og seed-scriptet springer Kæderne her over.
import { scrapeFitnessx } from './fitnessx.mjs';
import { scrapeLoop } from './loop.mjs';
import { scrapePuregym } from './puregym.mjs';
import { scrapeSats } from './sats.mjs';

export const CHAIN_SCRAPERS = [
  { chainId: 'sats', scrape: scrapeSats },
  { chainId: 'loop', scrape: scrapeLoop },
  { chainId: 'puregym', scrape: scrapePuregym },
  { chainId: 'fitnessx', scrape: scrapeFitnessx },
];

export const SCRAPED_CHAIN_IDS = CHAIN_SCRAPERS.map(({ chainId }) => chainId);
