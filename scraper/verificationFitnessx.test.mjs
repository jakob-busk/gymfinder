// Stikprøve-sammenligningen for Fitness X testet mod gemte sider fra fitnessx.dk.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parseCenterList, parsePriceList } from './chains/fitnessx.mjs';
import {
  checkWholeChain,
  compareFitnessxCenter,
  formatFitnessxVerification,
} from './verificationFitnessx.mjs';
import {
  FIXTURE_CENTERS,
  defaultCenterList,
  fitnessxFixture,
  membershipsTitled,
  withAjaxObject,
} from './testing/fitnessxFixtures.mjs';

const TODAY = '2026-10-22';
const priceList = parsePriceList(fitnessxFixture('oevrige-priser.html'));
const listed = parseCenterList(defaultCenterList());
const listedNamed = (name) => listed.find((center) => center.name === `Fitness X ${name}`);

const failing = (result) => result.checks.filter((check) => !check.ok);

describe('Fitness X-stikprøve mod prislisten og centersiden', () => {
  test('alle fem gemte Centre stemmer med prislisten og adresselinjen', () => {
    for (const [name, { file }] of Object.entries(FIXTURE_CENTERS)) {
      const result = compareFitnessxCenter(listedNamed(name), fitnessxFixture(file), priceList);
      assert.deepEqual(failing(result), [], name);
    }
  });

  test('Viborg: præcis de forventede tjek', () => {
    const result = compareFitnessxCenter(
      listedNamed('Viborg'),
      fitnessxFixture('center-viborg.html'),
      priceList,
    );
    assert.deepEqual(
      result.checks.map((check) => [check.what, check.scraper, check.website]),
      [
        ['Adresse', 'Tingvej 7, 8800 Viborg', 'Tingvej 7, 8800 Viborg'],
        [
          'Centersidens GUID',
          'de206fd6-497e-4ccf-8998-946ba2b1aef1',
          'de206fd6-497e-4ccf-8998-946ba2b1aef1',
        ],
        ['Kategori 2, under 30 (kr/md)', 360, 360],
        ['Kategori 2, 30+ (kr/md)', 400, 400],
        ['Kategori 2 med Træningsven, under 30, for to (kr/md)', 560, 560],
        ['Kategori 2 med Træningsven, 30+, for to (kr/md)', 600, 600],
        ['Kategori 1, under 30 (kr/md)', 400, 400],
        ['Kategori 1, 30+ (kr/md)', 450, 450],
        ['Kategori 1 med Træningsven, under 30, for to (kr/md)', 600, 600],
        ['Kategori 1 med Træningsven, 30+, for to (kr/md)', 650, 650],
        ['Oprettelsesgebyr (kr)', 60, 60],
        ['Admingebyr (kr/md)', 15, 15],
      ],
    );
  });

  test('Aarhus-særprisen sammenlignes med prislistens særmedlemskaber', () => {
    const result = compareFitnessxCenter(
      listedNamed('Aarhus C, Ankersgade'),
      fitnessxFixture('center-aarhus-ankersgade.html'),
      priceList,
    );
    const partnerChecks = result.checks
      .filter((check) => check.what.startsWith('Kategori 2 + Reformer med Træningsven'))
      .map((check) => [check.scraper, check.website]);
    assert.deepEqual(partnerChecks, [
      [800, 800],
      [950, 950],
    ]);
  });

  test('en pris, der afviger fra prislisten, opdages', () => {
    const html = withAjaxObject(fitnessxFixture('center-viborg.html'), (ajaxObject) => {
      const [kategori2Over30] = membershipsTitled(ajaxObject, /^Kategori 2 &#8211; Over 30$/);
      kategori2Over30.acf.pris = '399';
    });
    const result = compareFitnessxCenter(listedNamed('Viborg'), html, priceList);
    assert.deepEqual(failing(result), [
      { what: 'Kategori 2, 30+ (kr/md)', scraper: 399, website: 400, ok: false },
    ]);
  });

  test('en forkert adresse i centerlisten opdages', () => {
    const wrong = { ...listedNamed('Viborg'), address: 'Tingvej 9, 8800 Viborg' };
    const result = compareFitnessxCenter(wrong, fitnessxFixture('center-viborg.html'), priceList);
    assert.deepEqual(failing(result).map((check) => check.what), ['Adresse']);
  });

  test('hele Kæden: de seks Centre prissættes uden fejl ud fra de gemte sider', () => {
    const pages = Object.entries(FIXTURE_CENTERS).map(([name, { file }]) => ({
      listed: listedNamed(name),
      html: fitnessxFixture(file),
    }));
    assert.deepEqual(checkWholeChain(listed, pages, TODAY), {
      centers: 6,
      offers: 15,
      failures: [],
      unresolved: [],
    });
  });

  test('Centre uden GUID, hvis side ikke er hentet, står som ikke prissat', () => {
    const pages = [{ listed: listedNamed('Viborg'), html: fitnessxFixture('center-viborg.html') }];
    const summary = checkWholeChain(listed, pages, TODAY);
    // Lindgreens Allé og Skomagergade har intet GUID i centerlisten.
    assert.deepEqual(summary.unresolved, [
      'fitnessx-koebenhavn-s-lindgreens-alle',
      'fitnessx-roskilde-skomagergade',
    ]);
  });

  test('rapporten viser AFVIGER, hvis ét tjek fejler', () => {
    const result = {
      centerId: 'fitnessx-viborg',
      name: 'Fitness X Viborg',
      url: FIXTURE_CENTERS.Viborg.url,
      checks: [{ what: 'Adresse', scraper: 'a', website: 'b', ok: false }],
    };
    const wholeChain = { centers: 1, offers: 2, failures: [], unresolved: [] };
    const { markdown, allOk } = formatFitnessxVerification({
      date: TODAY,
      results: [result],
      wholeChain,
    });
    assert.equal(allOk, false);
    assert.match(markdown, /Resultat: \*\*AFVIGER\*\*/);
    assert.match(markdown, /\| Adresse \| a \| b \| NEJ \|/);
  });
});
