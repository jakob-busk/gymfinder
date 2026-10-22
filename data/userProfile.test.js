import {
  EMPTY_PREFERENCES,
  birthDateLimits,
  birthDateToDate,
  dateToBirthDate,
  formatBirthDate,
  formatPlaceAddress,
  fromStoredProfile,
  needsOnboarding,
  parseBirthDate,
  parseMonthlyPrice,
  toStoredProfile,
} from './userProfile';

const TODAY = new Date(2026, 9, 22);

const COMPLETE_PROFILE = {
  address: 'Østerbrogade 79, 2100 København Ø',
  location: { latitude: 55.7027, longitude: 12.5781 },
  birthDate: '1997-03-12',
  discountProfile: ['student', 'partner'],
  currentMembership: { monthlyPrice: 299, chainId: 'sats' },
  preferences: { ...EMPTY_PREFERENCES, sauna: true, machines: ['Bænkpres'] },
  onboardingCompletedAt: '2026-10-22T10:00:00.000Z',
};

describe('fødselsdato', () => {
  test.each([
    ['12-03-1997', '1997-03-12'],
    ['12.3.1997', '1997-03-12'],
    ['1/12/2001', '2001-12-01'],
    ['1997-03-12', '1997-03-12'],
    [' 29-02-2000 ', '2000-02-29'],
  ])('%s læses som %s', (text, birthDate) => {
    expect(parseBirthDate(text, TODAY)).toEqual({ birthDate });
  });

  test.each([
    ['', 'Udfyld din fødselsdato.'],
    ['12031997', 'Skriv fødselsdatoen som DD-MM-ÅÅÅÅ, fx 12-03-1997.'],
    ['31-02-1997', 'Den dato findes ikke.'],
    ['29-02-2001', 'Den dato findes ikke.'],
    ['23-10-2026', 'Fødselsdatoen kan ikke ligge i fremtiden.'],
    ['01-01-1890', 'Tjek årstallet.'],
    ['22-10-2026', 'Du skal være mindst 15 år for at bruge GymFinder.'],
    ['23-10-2011', 'Du skal være mindst 15 år for at bruge GymFinder.'],
  ])('%s afvises', (text, error) => {
    expect(parseBirthDate(text, TODAY)).toEqual({ error });
  });

  test('man må være præcis 15 år', () => {
    expect(parseBirthDate('22-10-2011', TODAY)).toEqual({ birthDate: '2011-10-22' });
  });

  test('datovælgeren går fra 120 til 15 år før i dag', () => {
    expect(birthDateLimits(TODAY)).toEqual({
      minimumDate: new Date(1906, 9, 22),
      maximumDate: new Date(2011, 9, 22),
    });
  });

  test('datovælgerens dato gemmes som den lokale dato', () => {
    expect(dateToBirthDate(new Date(1997, 2, 12, 23, 30))).toBe('1997-03-12');
    expect(dateToBirthDate(new Date(2001, 11, 1, 0, 5))).toBe('2001-12-01');
  });

  test('fødselsdatoen åbner datovælgeren på den dato, ellers 25 år tilbage', () => {
    expect(birthDateToDate('1997-03-12', TODAY)).toEqual(new Date(1997, 2, 12));
    expect(birthDateToDate(null, TODAY)).toEqual(new Date(2001, 0, 1));
  });

  test('vises i dansk format', () => {
    expect(formatBirthDate('1997-03-12')).toBe('12-03-1997');
    expect(formatBirthDate(null)).toBe('');
  });
});

describe('månedspris for Nuværende medlemskab', () => {
  test.each([
    ['299', 299],
    ['249,50', 249.5],
    [' 349 kr ', 349],
    ['199.5', 199.5],
  ])('%s er %d kr', (text, price) => {
    expect(parseMonthlyPrice(text)).toBe(price);
  });

  test.each(['', '0', '-100', 'gratis', '12,345', '10000'])('%s er ikke en gyldig pris', (text) => {
    expect(parseMonthlyPrice(text)).toBeNull();
  });
});

describe('adresse fra GPS', () => {
  test('gade, husnummer, postnummer og by på én linje', () => {
    const place = { street: 'Østerbrogade', streetNumber: '79', postalCode: '2100', city: 'København Ø' };
    expect(formatPlaceAddress(place)).toBe('Østerbrogade 79, 2100 København Ø');
  });

  test('uden gade bruges stedets navn', () => {
    expect(formatPlaceAddress({ name: 'Rådhuspladsen', postalCode: '1550', city: 'København' })).toBe(
      'Rådhuspladsen, 1550 København',
    );
  });

  test('intet sted giver tom tekst', () => {
    expect(formatPlaceAddress(null)).toBe('');
  });
});

describe('gem og hent profil', () => {
  test('en komplet profil kommer uændret tilbage', () => {
    expect(fromStoredProfile(toStoredProfile(COMPLETE_PROFILE))).toEqual(COMPLETE_PROFILE);
  });

  test('felter, databasen ikke gemmer (null og tomme lister), får standardværdier', () => {
    // Sådan ser en profil ud i Realtime Database, hvis kun de krævede trin er udfyldt.
    const stored = {
      address: 'Østerbrogade 79, 2100 København Ø',
      location: { latitude: 55.7027, longitude: 12.5781 },
      birthDate: '1997-03-12',
      preferences: { maxDistanceKm: 15 },
    };

    expect(fromStoredProfile(stored)).toEqual({
      ...stored,
      discountProfile: [],
      currentMembership: null,
      preferences: EMPTY_PREFERENCES,
      onboardingCompletedAt: null,
    });
  });

  test('lister, der kommer tilbage som objekter, bliver til lister', () => {
    const stored = {
      ...COMPLETE_PROFILE,
      discountProfile: { 0: 'student', 2: 'partner' },
      preferences: { ...COMPLETE_PROFILE.preferences, machines: { 0: 'Bænkpres' } },
    };

    expect(fromStoredProfile(stored)).toEqual(COMPLETE_PROFILE);
  });

  test('ukendte Rabatgrupper og felter uden for profilen fjernes', () => {
    const stored = { ...COMPLETE_PROFILE, discountProfile: ['firma', 'student'], favorites: {} };

    expect(toStoredProfile(stored)).toEqual({ ...COMPLETE_PROFILE, discountProfile: ['student'] });
  });

  test('Nuværende medlemskab uden gyldig pris betyder "Ingen"', () => {
    const stored = { ...COMPLETE_PROFILE, currentMembership: { monthlyPrice: 0, chainId: 'sats' } };

    expect(fromStoredProfile(stored).currentMembership).toBeNull();
  });

  test('intet gemt giver ingen profil', () => {
    expect(fromStoredProfile(null)).toBeNull();
  });
});

describe('hvornår onboarding vises', () => {
  const { onboardingCompletedAt, ...notCompleted } = COMPLETE_PROFILE;

  test('første gang, uden profil', () => {
    expect(needsOnboarding({ cachedDone: false, profile: null })).toBe(true);
  });

  test('ikke igen, når den er gennemført på denne telefon', () => {
    expect(needsOnboarding({ cachedDone: true, profile: notCompleted })).toBe(false);
  });

  test('ikke, når profilen er gennemført på en anden telefon', () => {
    expect(needsOnboarding({ cachedDone: false, profile: COMPLETE_PROFILE })).toBe(false);
  });

  test('igen, hvis adresse eller fødselsdato mangler', () => {
    expect(needsOnboarding({ cachedDone: true, profile: { ...COMPLETE_PROFILE, location: null } })).toBe(
      true,
    );
    expect(needsOnboarding({ cachedDone: true, profile: { ...COMPLETE_PROFILE, birthDate: null } })).toBe(
      true,
    );
  });

  test('en halvt udfyldt onboarding startes forfra', () => {
    expect(needsOnboarding({ cachedDone: false, profile: notCompleted })).toBe(true);
  });
});
