// Den falske database skal afvise det samme som Realtime Database, ellers kan nat-job-testene
// være grønne, mens den rigtige opdatering fejler.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeDatabase } from './fakeDatabase.mjs';

describe('falsk Realtime Database', () => {
  test('multi-path-opdatering skriver, overskriver og sletter med null', async () => {
    const db = createFakeDatabase({ Centers: { a: { name: 'A', old: true }, b: { name: 'B' } } });
    await db.ref().update({
      'Centers/a': { name: 'A2' },
      'Centers/b/missingNights': 1,
      'Centers/c': null,
      'Offers/a/x': { price: 1 },
    });

    assert.deepEqual(db.snapshot(), {
      Centers: { a: { name: 'A2' }, b: { name: 'B', missingNights: 1 } },
      Offers: { a: { x: { price: 1 } } },
    });
  });

  test('sletning af det sidste barn fjerner den tomme node', async () => {
    const db = createFakeDatabase({ Offers: { a: { x: { price: 1 } } } });
    await db.ref().update({ 'Offers/a/x': null });
    assert.deepEqual(db.snapshot(), {});
    assert.equal((await db.ref('Offers').get()).val(), null);
  });

  test('afviser en sti, der ligger under en anden sti i samme opdatering', async () => {
    const db = createFakeDatabase();
    await assert.rejects(
      db.ref().update({ 'Offers/a': null, 'Offers/a/x': { price: 1 } }),
      /ancestor/,
    );
  });

  test('afviser undefined, også inde i et objekt', async () => {
    const db = createFakeDatabase();
    await assert.rejects(db.ref().update({ 'Offers/a/x': { price: undefined } }), /undefined/);
  });

  test('lister bevares som lister', async () => {
    const db = createFakeDatabase();
    await db.ref().update({ 'Chains/sats': { discounts: [{ percentOff: 20 }] } });
    assert.deepEqual((await db.ref('Chains/sats/discounts').get()).val(), [{ percentOff: 20 }]);
  });
});
