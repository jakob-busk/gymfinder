import { centerDisplayName } from './centerDisplayName';

const PUREGYM = { id: 'puregym', name: 'PureGym' };
const FITNESSX = { id: 'fitnessx', name: 'Fitness X' };
const SATS = { id: 'sats', name: 'SATS' };
const LOOP = { id: 'loop', name: 'LOOP Fitness' };

describe('Centrets navn ved siden af Kædens logo', () => {
  it.each([
    ['PureGym København Nørrebro', PUREGYM, 'København Nørrebro'],
    ['PureGym Kbh Ø., Århusgade', PUREGYM, 'Kbh Ø., Århusgade'],
    ['Fitness X Lyngby', FITNESSX, 'Lyngby'],
    ['Fitness X Aarhus C', FITNESSX, 'Aarhus C'],
    ['SATS Adelgade', SATS, 'Adelgade'],
    ['SATS Frederiksberg', SATS, 'Frederiksberg'],
    ['LOOP Viborg', LOOP, 'Viborg'],
    ['LOOP Fitness Aabenraa', LOOP, 'Aabenraa'],
  ])('%s → %s', (name, chain, expected) => {
    expect(centerDisplayName(name, chain)).toBe(expected);
  });

  it('skelner ikke mellem store og små bogstaver og fjerner skilletegn', () => {
    expect(centerDisplayName('Puregym - Glostrup', PUREGYM)).toBe('Glostrup');
    expect(centerDisplayName('sats · Nørrebro', SATS)).toBe('Nørrebro');
    expect(centerDisplayName('Loop – Valby', LOOP)).toBe('Valby');
  });

  it('beholder det fulde navn, når der intet er tilbage eller Kæden ikke står forrest', () => {
    expect(centerDisplayName('SATS', SATS)).toBe('SATS');
    expect(centerDisplayName('Satsning Center', SATS)).toBe('Satsning Center');
    expect(centerDisplayName('Lokalt Center', PUREGYM)).toBe('Lokalt Center');
    expect(centerDisplayName('PureGym Amager', null)).toBe('PureGym Amager');
  });
});
