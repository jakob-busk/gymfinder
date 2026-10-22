// Fælles læsning af kronebeløb (bruges af SATS, PureGym og Fitness X).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { parseAmount } from './amount.mjs';

describe('parseAmount', () => {
  test('tusindtal med og uden punktum og med øre', () => {
    assert.equal(parseAmount('1.050'), 1050);
    assert.equal(parseAmount('1050'), 1050);
    assert.equal(parseAmount('1050,00'), 1050);
    assert.equal(parseAmount('1.050,00 kr.'), 1050);
    assert.equal(parseAmount('99,95'), 99.95);
    assert.equal(parseAmount('12.345.678'), 12345678);
  });

  test('beløb i tekst', () => {
    assert.equal(parseAmount('439,20'), 439.2);
    assert.equal(parseAmount('4.193,00 kr.'), 4193);
    assert.equal(parseAmount('649 kr./md.'), 649);
    assert.equal(parseAmount('1.200 kr.'), 1200);
    assert.equal(parseAmount('60'), 60);
  });

  test('andet end et tal giver null', () => {
    assert.equal(parseAmount('Gratis'), null);
    assert.equal(parseAmount(''), null);
    assert.equal(parseAmount(null), null);
    assert.equal(parseAmount(undefined), null);
  });
});
