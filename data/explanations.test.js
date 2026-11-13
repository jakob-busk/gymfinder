import { EXPLANATIONS } from './explanations';

describe('Forklaringer til ⓘ-infoboksen', () => {
  it('forklarer alle fagord, der har en ⓘ', () => {
    const titles = Object.values(EXPLANATIONS).map((explanation) => explanation.title);

    expect(titles.sort()).toEqual(
      [
        'Admingebyr',
        'Anbefalet',
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

  it('forklarer Anbefalet kort ud fra pris og afstand, uden tal og interne ord', () => {
    const { text } = EXPLANATIONS.recommended;
    expect(text).toMatch(/pris/);
    expect(text).toMatch(/afstand/);
    expect(text).toMatch(/dine ønsker/);
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(/Rangeringspris/i);
    expect(text).not.toMatch(/ærlig årspris/i);
  });
});
