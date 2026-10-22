import { EXPLANATIONS } from './explanations';

describe('Forklaringer til ⓘ-infoboksen', () => {
  it('forklarer alle fagord, der har en ⓘ', () => {
    const titles = Object.values(EXPLANATIONS).map((explanation) => explanation.title);

    expect(titles.sort()).toEqual(
      [
        'Admingebyr',
        'Binding',
        'Ikke oplyst',
        'Kvartalspris',
        'Makkerpris',
        'Spar mere-forslag',
        'Træn med en makker',
        'Ærlig årspris',
      ].sort(),
    );
  });

  it('har en forklaring til hvert fagord', () => {
    Object.values(EXPLANATIONS).forEach((explanation) => {
      expect(explanation.text.length).toBeGreaterThan(40);
    });
  });
});
