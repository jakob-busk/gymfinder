// Stikprøve-sammenligningen for PureGym testet mod gemte svar fra puregym.dk.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildCenter, parseCenterList, parsePriceList } from './chains/puregym.mjs';
import {
  PUREGYM_VERIFICATION_DESCRIPTION,
  compareCenter,
  parseCenterPage,
  parseVisibleCards,
} from './puregymVerification.mjs';
import { formatVerification } from './verification.mjs';
import { FIXTURE_CENTERS, puregymFixture, withCards } from './testing/puregymFixtures.mjs';

const TODAY = '2026-10-22';

const listedFor = (node) =>
  parseCenterList(puregymFixture('find-center.html')).find((center) => center.nodeId === node);

// Samme skridt som verifyPuregym.mjs, men med gemte svar.
function compareFixture(node, { under30, over30, centerPageHtml } = {}) {
  const listed = listedFor(String(node));
  const responses = {
    under30: under30 ?? puregymFixture(`ajax-${node}-under30.json`),
    over30: over30 ?? puregymFixture(`ajax-${node}-over30.json`),
  };
  const fees = parsePriceList(puregymFixture('priser.html'));
  const { center } = buildCenter({ listed, responses, fees, today: TODAY });
  return compareCenter({
    listed,
    center,
    responses,
    centerPageHtml: centerPageHtml ?? puregymFixture(FIXTURE_CENTERS[node].page),
  });
}

const failing = (result) => result.checks.filter((check) => !check.ok);

describe('stikprøve mod puregym.dk', () => {
  test('læser de synlige priskort uafhængigt af settings og det med småt', () => {
    assert.deepEqual(parseVisibleCards(puregymFixture('ajax-118-under30.json')), [
      { name: 'Unlimited', standardPrice: 429, currentPrice: 321.75 },
      { name: 'Core', standardPrice: 349, currentPrice: 349 },
    ]);
  });

  test('læser navn, adresse og koordinater fra centersidens JSON-LD', () => {
    assert.deepEqual(parseCenterPage(puregymFixture('center-kbh-oe-aarhusgade.html')), {
      name: 'Kbh Ø., Århusgade',
      address: 'Århusgade 102, 2100 København Ø',
      location: { latitude: 55.706711010263824, longitude: 12.587304744888911 },
    });
  });

  test('Århusgade stemmer felt for felt', () => {
    assert.deepEqual(compareFixture(118), {
      centerId: 'puregym-123',
      name: 'PureGym Kbh Ø., Århusgade',
      url: 'https://www.puregym.dk/find-center/kbh-oe-aarhusgade',
      checks: [
        {
          what: 'Adresse',
          scraper: 'Århusgade 102, 2100 København Ø',
          website: 'Århusgade 102, 2100 København Ø',
          ok: true,
        },
        {
          what: 'Navn',
          scraper: 'PureGym Kbh Ø., Århusgade',
          website: 'Kbh Ø., Århusgade',
          ok: true,
        },
        {
          what: 'Koordinater',
          scraper: '55.70671, 12.58730',
          website: '55.70671, 12.58730',
          ok: true,
        },
        { what: 'Unlimited under 30 (kr/md)', scraper: 429, website: 429, ok: true },
        { what: 'Unlimited 30+ (kr/md)', scraper: 479, website: 479, ok: true },
        {
          what: 'Unlimited under 30 Kampagnepris (kr/md)',
          scraper: 321.75,
          website: 321.75,
          ok: true,
        },
        {
          what: 'Unlimited 30+ Kampagnepris (kr/md)',
          scraper: 359.25,
          website: 359.25,
          ok: true,
        },
        { what: 'Core under 30 (kr/md)', scraper: 349, website: 349, ok: true },
        { what: 'Core 30+ (kr/md)', scraper: 399, website: 399, ok: true },
        { what: 'Normalpris fra (find center)', scraper: 349, website: 349, ok: true },
      ],
    });
  });

  test('alle tre gemte Centre stemmer med hjemmesiden', () => {
    for (const node of Object.keys(FIXTURE_CENTERS)) {
      assert.deepEqual(failing(compareFixture(node)), [], node);
    }
  });

  test('et medlemskab, der kun vises for 30+, står i rapporten, men er ikke en afvigelse', () => {
    const odense = compareFixture(146);
    const coreAndClasses = odense.checks.find((check) => check.what.startsWith('Core og Hold'));
    assert.deepEqual(coreAndClasses, {
      what: 'Core og Hold 30+ (findes kun for 30+, springes over)',
      scraper: undefined,
      website: 369,
      ok: true,
    });
  });

  test('en normalpris i det med småt, der afviger fra det synlige priskort, opdages', () => {
    const under30 = withCards(puregymFixture('ajax-118-under30.json'), (html) =>
      html.replace('Prisen for medlemskabet er 349,-', 'Prisen for medlemskabet er 359,-'),
    );
    assert.deepEqual(failing(compareFixture(118, { under30 })), [
      { what: 'Core under 30 (kr/md)', scraper: 359, website: 349, ok: false },
      { what: 'Normalpris fra (find center)', scraper: 359, website: 349, ok: false },
    ]);
  });

  test('et synligt priskort, som scraperen ikke har, opdages', () => {
    const extraCard = (html) =>
      html.replace(
        '<div id="membership-cards"',
        '<div id="membership-cards" data-product_id="1"><div class="card__title-prefix">' +
          'Off Peak</div><div class="card__price__title">199</div></div>' +
          '<div id="membership-cards"',
      );
    const under30 = withCards(puregymFixture('ajax-118-under30.json'), extraCard);
    const over30 = withCards(puregymFixture('ajax-118-over30.json'), extraCard);
    const problems = failing(compareFixture(118, { under30, over30 }));
    assert.deepEqual(
      problems.map((check) => check.what),
      ['Off Peak under 30 (kr/md)', 'Off Peak 30+ (kr/md)'],
    );
  });

  test('en adresse eller placering, der afviger fra centersiden, opdages', () => {
    const page = puregymFixture('center-kbh-oe-aarhusgade.html')
      .replace('\\u00C5rhusgade\\u0020102', 'Århusgade 104')
      .replace('55.706711010263824', '55.7167');
    assert.deepEqual(
      failing(compareFixture(118, { centerPageHtml: page })).map((check) => check.what),
      ['Adresse', 'Koordinater'],
    );
  });

  test('rapporten bruger PureGyms egen forklaring og siger STEMMER', () => {
    const { markdown, allOk } = formatVerification({
      chainName: 'PureGym',
      date: TODAY,
      results: [compareFixture(45)],
      description: PUREGYM_VERIFICATION_DESCRIPTION,
    });
    assert.equal(allOk, true);
    assert.match(markdown, /# Stikprøve: PureGym/);
    assert.match(markdown, /Resultat: \*\*STEMMER\*\*/);
    assert.match(markdown, /npm run verify:puregym/);
    assert.match(markdown, /\| Plus 30\+ \(kr\/md\) \| 379 \| 379 \| ja \|/);
  });
});
