// Sikkerhedsreglerne i database.rules.json: centerdata kan læses af alle, men kun skrives af
// service-accounten (firebase-admin omgår reglerne). Brugerdata kan kun læses og skrives af
// brugeren selv. Alt andet er lukket, fordi Realtime Database som standard nægter adgang.
import rulesFile from '../database.rules.json';

const { rules } = rulesFile;

describe('sikkerhedsregler', () => {
  test.each(['Chains', 'Centers', 'Offers'])('%s kan læses af alle og ikke skrives af klienter', (node) => {
    expect(rules[node]['.read']).toBe(true);
    expect(rules[node]['.write']).toBe(false);
  });

  test('brugerdata er kun tilgængelig for brugerens egen uid', () => {
    const ownUidOnly = 'auth != null && auth.uid === $uid';

    expect(rules.Users['.read']).toBeUndefined();
    expect(rules.Users['.write']).toBeUndefined();
    expect(rules.Users.$uid['.read']).toBe(ownUidOnly);
    expect(rules.Users.$uid['.write']).toBe(ownUidOnly);
  });

  test('roden giver ingen adgang, så nye noder er lukkede som standard', () => {
    expect(rules['.read']).toBeUndefined();
    expect(rules['.write']).toBeUndefined();
  });
});
