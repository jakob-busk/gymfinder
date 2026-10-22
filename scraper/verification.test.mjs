// Stikprøve-sammenligningen testet mod gemte centersider fra sats.dk.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parseCenterList } from './chains/sats.mjs';
import {
  compareCenter,
  formatVerification,
  parseVisiblePricingCards,
  pickRandom,
} from './verification.mjs';
import { satsFixture, withProps } from './testing/satsFixtures.mjs';

const listed = (clubId) =>
  parseCenterList(satsFixture('centerliste.html')).find((center) => center.clubId === clubId);

describe('stikprøve mod hjemmesiden', () => {
  test('læser de synlige priskort uafhængigt af data-props', () => {
    assert.deepEqual(parseVisiblePricingCards(satsFixture('center-437-helsingor.html')), [
      { membershipId: '1CLUB_ALLDAY_NOBND_GX_U30', name: 'Basic', price: 449 },
      { membershipId: 'REGION_ALLDAY_NOBND_GX_U30', name: 'Flexible', price: 599 },
      { membershipId: 'PREMIUM_NOBND_U30', name: 'Premium', price: 699 },
    ]);
  });

  test('alle tre gemte Centre stemmer med hjemmesiden', () => {
    for (const [clubId, file] of [
      ['412', 'center-412-adelgade.html'],
      ['437', 'center-437-helsingor.html'],
      ['434', 'center-434-roskilde.html'],
    ]) {
      const result = compareCenter(listed(clubId), satsFixture(file));
      assert.equal(result.checks.length, 4, clubId);
      for (const check of result.checks) assert.ok(check.ok, `${clubId}: ${check.what}`);
    }
  });

  test('en pris i data-props, der afviger fra det synlige priskort, opdages', () => {
    const html = withProps(satsFixture('center-412-adelgade.html'), (props) => {
      props.becomeMemberSection.views[0].segments[0].memberships[0].price = '459';
    });
    const basic = compareCenter(listed('412'), html).checks.find((check) =>
      check.what.startsWith('Basic'),
    );
    assert.deepEqual(basic, {
      what: 'Basic under 30 (kr/md)',
      scraper: 459,
      website: 549,
      ok: false,
    });
  });

  test('en adresse, der afviger mellem listen og centersiden, opdages', () => {
    const result = compareCenter(
      { ...listed('412'), address: 'Adelgade 9, 1304 København K' },
      satsFixture('center-412-adelgade.html'),
    );
    assert.deepEqual(result.checks[0], {
      what: 'Adresse',
      scraper: 'Adelgade 9, 1304 København K',
      website: 'Adelgade 5-7, 1304, København K',
      ok: false,
    });
  });

  test('vælger det ønskede antal forskellige Centre', () => {
    const values = [0.99, 0, 0.5];
    const picked = pickRandom(['a', 'b', 'c', 'd'], 3, () => values.shift());
    assert.deepEqual(picked, ['d', 'a', 'c']);
  });

  test('rapporten siger AFVIGER, hvis bare ét felt ikke stemmer', () => {
    const ok = { what: 'Adresse', scraper: 'x', website: 'x', ok: true };
    const bad = { what: 'Basic under 30 (kr/md)', scraper: 459, website: 549, ok: false };
    const { markdown, allOk } = formatVerification({
      chainName: 'SATS',
      date: '2026-10-22',
      results: [{ centerId: 'sats-412', name: 'SATS Adelgade', url: 'u', checks: [ok, bad] }],
    });
    assert.equal(allOk, false);
    assert.match(markdown, /Resultat: \*\*AFVIGER\*\*/);
    assert.match(markdown, /\| Basic under 30 \(kr\/md\) \| 459 \| 549 \| NEJ \|/);
  });
});
