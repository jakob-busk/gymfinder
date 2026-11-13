import { accountErrorMessage, describeAccount, validateAccountForm } from './account';

describe('validateAccountForm', () => {
  const FORM = { name: ' Jakob ', email: ' Jakob@Example.DK ', password: 'hemmelig' };

  test('renser navn og e-mail', () => {
    expect(validateAccountForm(FORM)).toEqual({
      name: 'Jakob',
      email: 'jakob@example.dk',
      password: 'hemmelig',
    });
  });

  test('kræver navn ved oprettelse, men ikke ved log ind', () => {
    expect(validateAccountForm({ ...FORM, name: '' }).error).toBe('Udfyld dit navn.');
    expect(validateAccountForm({ ...FORM, name: '' }, 'login').error).toBeUndefined();
  });

  test('afviser en e-mail uden @ og domæne', () => {
    expect(validateAccountForm({ ...FORM, email: 'jakob' }).error).toMatch(/e-mail/);
    expect(validateAccountForm({ ...FORM, email: 'jakob@example' }).error).toMatch(/e-mail/);
  });

  test('kræver mindst 6 tegn i adgangskoden ved oprettelse', () => {
    expect(validateAccountForm({ ...FORM, password: '12345' }).error).toMatch(/mindst 6 tegn/);
    expect(validateAccountForm({ ...FORM, password: '12345' }, 'login').error).toBeUndefined();
    expect(validateAccountForm({ ...FORM, password: '' }, 'login').error).toMatch(/adgangskode/);
  });
});

describe('accountErrorMessage', () => {
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  const EMAIL_IN_USE = 'Der findes allerede en konto med den e-mail. Log ind i stedet.';

  test.each([
    ['auth/wrong-password', 'Forkert e-mail eller adgangskode.'],
    ['auth/invalid-credential', 'Forkert e-mail eller adgangskode.'],
    ['auth/email-already-in-use', EMAIL_IN_USE],
    ['auth/credential-already-in-use', EMAIL_IN_USE],
    ['auth/weak-password', 'Adgangskoden er for svag. Brug mindst 6 tegn.'],
  ])('%s vises på dansk', (code, message) => {
    expect(accountErrorMessage({ code })).toBe(message);
  });

  test('ukendte fejl får en generel tekst', () => {
    expect(accountErrorMessage(new Error('boom'))).toBe('Noget gik galt. Prøv igen om lidt.');
  });

  test('en ukendt fejlkode giver en generel tekst og skrives i konsollen', () => {
    expect(accountErrorMessage({ code: 'auth/noget-nyt' })).toBe(
      'Noget gik galt. Prøv igen om lidt.',
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('auth/noget-nyt'));
  });

  test.each([
    ['auth/operation-not-allowed', 'Konto virker ikke lige nu', 'Sign-in method'],
    ['auth/admin-restricted-operation', 'Nye konti kan ikke oprettes', 'oprettelse af brugere'],
    ['auth/configuration-not-found', 'Konto virker ikke lige nu', 'Authentication'],
    ['auth/invalid-api-key', 'Konto virker ikke lige nu', 'API-nøgle'],
    ['auth/api-key-not-valid.-please-pass-a-valid-api-key.', 'Konto virker ikke', 'API-nøgle'],
    ['PERMISSION_DENIED', 'gemt på telefonen', 'Realtime Database'],
  ])('opsætningsfejlen %s har en brugertekst og en teknisk note i konsollen', (code, text, hint) => {
    const message = accountErrorMessage({ code });
    expect(message).toContain(text);
    expect(message).not.toMatch(/Firebase|fejlkode|auth\//);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(hint));
  });

  test('brugerfejl skrives ikke i konsollen', () => {
    expect(accountErrorMessage({ code: 'auth/password-does-not-meet-requirements' })).toContain(
      'opfylder ikke kravene',
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('describeAccount', () => {
  test('anonym bruger', () => {
    const user = { uid: 'u1', isAnonymous: true, email: null, displayName: null };

    expect(describeAccount(user)).toEqual({
      uid: 'u1',
      isAnonymous: true,
      email: null,
      name: null,
    });
  });

  test('bruger med konto', () => {
    expect(
      describeAccount({ uid: 'u1', isAnonymous: false, email: 'a@b.dk', displayName: 'Jakob' }),
    ).toEqual({ uid: 'u1', isAnonymous: false, email: 'a@b.dk', name: 'Jakob' });
  });

  test('ingen bruger', () => {
    expect(describeAccount(null)).toBeNull();
  });
});
