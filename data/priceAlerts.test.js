import { fromStoredFavorites, newFavorite } from './favorites';
import {
  DEFAULT_THRESHOLD_PER_MONTH,
  centerIdFromNotification,
  changeCurrentMembershipThreshold,
  currentMembershipAlertTrigger,
  describePriceAlert,
  favoriteAlertTriggers,
  fromStoredCurrentMembershipAlert,
  hasAnyPriceAlert,
  markCurrentMembershipAlertNotified,
  markFavoriteNotified,
  newCurrentMembershipAlert,
  parseThreshold,
  priceAlertMessage,
  setFavoritePriceAlert,
  thresholdText,
} from './priceAlerts';

// Adfærdstests for Prisalarmer: tærskel, hvornår en alarm på en Favorit eller på Nuværende
// medlemskab er opfyldt, og beskeden. Alle tal er regnet ud på forhånd.

const TODAY = '2026-10-22';
const HOME = { latitude: 55.6761, longitude: 12.5683 };
const USER = {
  birthDate: '1990-01-01',
  discountProfile: [],
  currentMembership: null,
  location: HOME,
  preferences: { maxDistanceKm: 15 },
};

const CHAIN = { id: 'kaede', name: 'Kæde', discounts: [] };

function offer(overrides = {}) {
  return {
    id: 'basis',
    name: 'Basis',
    subscriptionType: 'Lokal center',
    standardPrice: 300,
    campaignPrice: null,
    campaignMonths: 0,
    signupFee: 0,
    adminFee: 0,
    bindingMonths: 0,
    partnerPrice: null,
    ...overrides,
  };
}

function center(id, offers, location = HOME) {
  return {
    id,
    chainId: 'kaede',
    name: `Center ${id}`,
    address: 'Gaden 1, 1000 København',
    location,
    facilities: {},
    machines: null,
    offers,
  };
}

const favoriteWithAlert = (savedPrice, thresholdPerMonth) => ({
  ...newFavorite({ honestYearlyPrice: savedPrice }),
  priceAlert: { thresholdPerMonth },
});

describe('tærskel', () => {
  test('læser kroner med komma og "kr", og tom tekst betyder ethvert fald', () => {
    expect(parseThreshold('50')).toEqual({ thresholdPerMonth: 50 });
    expect(parseThreshold(' 49,50 kr ')).toEqual({ thresholdPerMonth: 49.5 });
    expect(parseThreshold('')).toEqual({ thresholdPerMonth: null });
    expect(parseThreshold('0')).toEqual({ thresholdPerMonth: null });
  });

  test('afviser tekst, der ikke er et beløb', () => {
    expect(parseThreshold('halvtreds').error).toBeDefined();
    expect(parseThreshold('-10').error).toBeDefined();
  });

  test('er forudfyldt med 50 kr/md, når alarmen slås til', () => {
    expect(DEFAULT_THRESHOLD_PER_MONTH).toBe(50);
    expect(thresholdText(null)).toBe('50');
    expect(thresholdText({ thresholdPerMonth: null })).toBe('');
    expect(thresholdText({ thresholdPerMonth: 25.5 })).toBe('25,5');
  });

  test('beskrives på dansk for Favorit og Nuværende medlemskab', () => {
    expect(describePriceAlert({ thresholdPerMonth: 50 })).toBe(
      'Besked, når prisen falder mindst 50 kr/md.',
    );
    expect(describePriceAlert({ thresholdPerMonth: null })).toBe('Besked ved ethvert prisfald.');
    expect(describePriceAlert({ thresholdPerMonth: 50 }, 'currentMembership')).toBe(
      'Besked, når et Tilbud er mindst 50 kr/md billigere end dit nuværende medlemskab.',
    );
  });
});

describe('Prisalarm på en Favorit', () => {
  test('slås til med tærskel, og faldet måles fra prisen lige nu', () => {
    const favorites = { a: newFavorite({ honestYearlyPrice: 300 }) };

    const next = setFavoritePriceAlert(favorites, 'a', { thresholdPerMonth: 50 }, 280);

    expect(next.a.priceAlert).toEqual({ thresholdPerMonth: 50 });
    expect(next.a.honestYearlyPrice).toBe(280);
  });

  test('slås til uden tærskel og kan slås fra igen; gemmes i databasens form', () => {
    const favorites = { a: newFavorite({ honestYearlyPrice: 300 }) };

    const on = setFavoritePriceAlert(favorites, 'a', { thresholdPerMonth: null }, 300);
    expect(fromStoredFavorites(JSON.parse(JSON.stringify(on))).a.priceAlert).toEqual({
      thresholdPerMonth: null,
    });

    const off = setFavoritePriceAlert(on, 'a', null);
    expect(off.a.priceAlert).toBeNull();
    expect(off.a.honestYearlyPrice).toBe(300);
  });

  test('en ukendt Favorit ændrer intet', () => {
    const favorites = { a: newFavorite({ honestYearlyPrice: 300 }) };
    expect(setFavoritePriceAlert(favorites, 'b', { thresholdPerMonth: 50 }, 250)).toBe(favorites);
  });

  test('udløses, når faldet når tærsklen, men ikke under den', () => {
    const centers = [center('a', [offer({ standardPrice: 250 })])];
    const reached = { a: favoriteWithAlert(300, 50) };
    const notReached = { a: favoriteWithAlert(299, 50) };

    const triggers = favoriteAlertTriggers({
      favorites: reached,
      centers,
      chains: [CHAIN],
      user: USER,
      today: TODAY,
    });

    expect(triggers).toEqual([
      {
        kind: 'favorite',
        centerId: 'a',
        centerName: 'Center a',
        honestYearlyPrice: 250,
        previousPrice: 300,
        savingPerMonth: 50,
      },
    ]);
    expect(
      favoriteAlertTriggers({
        favorites: notReached,
        centers,
        chains: [CHAIN],
        user: USER,
        today: TODAY,
      }),
    ).toEqual([]);
  });

  test('uden tærskel udløses den ved ethvert fald, men ikke ved ørebeløb', () => {
    const centers = [center('a', [offer({ standardPrice: 295 })])];
    const run = (savedPrice) =>
      favoriteAlertTriggers({
        favorites: { a: favoriteWithAlert(savedPrice, null) },
        centers,
        chains: [CHAIN],
        user: USER,
        today: TODAY,
      });

    expect(run(300)).toHaveLength(1);
    expect(run(295.5)).toEqual([]);
  });

  test('en ny Kampagnepris tæller som fald', () => {
    // 3 måneder à 0 kr og 9 måneder à 300 kr = 2.700 kr / 12 = 225 kr/md
    const centers = [
      center('a', [offer({ standardPrice: 300, campaignPrice: 0, campaignMonths: 3 })]),
    ];

    const [trigger] = favoriteAlertTriggers({
      favorites: { a: favoriteWithAlert(300, 50) },
      centers,
      chains: [CHAIN],
      user: USER,
      today: TODAY,
    });

    expect(trigger.savingPerMonth).toBe(75);
  });

  test('Favoritter uden alarm, uden gemt pris eller uden Center udløser intet', () => {
    const centers = [center('a', [offer({ standardPrice: 100 })])];
    const favorites = {
      a: newFavorite({ honestYearlyPrice: 300 }),
      b: favoriteWithAlert(300, 50),
      c: { ...favoriteWithAlert(300, 50), honestYearlyPrice: null },
    };

    expect(
      favoriteAlertTriggers({ favorites, centers, chains: [CHAIN], user: USER, today: TODAY }),
    ).toEqual([]);
  });

  test('efter beskeden måles næste fald fra den nye pris', () => {
    const centers = [center('a', [offer({ standardPrice: 250 })])];
    const favorite = markFavoriteNotified(favoriteWithAlert(300, 50), 250);

    expect(favorite.honestYearlyPrice).toBe(250);
    expect(
      favoriteAlertTriggers({
        favorites: { a: favorite },
        centers,
        chains: [CHAIN],
        user: USER,
        today: TODAY,
      }),
    ).toEqual([]);
  });
});

describe('Prisalarm på Nuværende medlemskab', () => {
  const member = { ...USER, currentMembership: { monthlyPrice: 349, chainId: null } };
  const FAR_AWAY = { latitude: 57.048, longitude: 9.9187 };

  test('finder det billigste Center inden for maks. afstand, når Besparelsen når tærsklen', () => {
    const centers = [
      center('naer', [offer({ standardPrice: 299 })]),
      center('billigst', [offer({ standardPrice: 249 })]),
      center('aalborg', [offer({ standardPrice: 99 })], FAR_AWAY),
    ];

    const trigger = currentMembershipAlertTrigger({
      alert: newCurrentMembershipAlert({ thresholdPerMonth: 50 }),
      centers,
      chains: [CHAIN],
      user: member,
      today: TODAY,
    });

    expect(trigger).toEqual({
      kind: 'currentMembership',
      centerId: 'billigst',
      centerName: 'Center billigst',
      honestYearlyPrice: 249,
      savingPerMonth: 100,
    });
  });

  test('udløses ikke, når Besparelsen er under tærsklen', () => {
    const centers = [center('a', [offer({ standardPrice: 300 })])];

    expect(
      currentMembershipAlertTrigger({
        alert: newCurrentMembershipAlert({ thresholdPerMonth: 50 }),
        centers,
        chains: [CHAIN],
        user: member,
        today: TODAY,
      }),
    ).toBeNull();
  });

  test('uden tærskel udløses den ved enhver Besparelse', () => {
    const centers = [center('a', [offer({ standardPrice: 339 })])];

    const trigger = currentMembershipAlertTrigger({
      alert: newCurrentMembershipAlert(),
      centers,
      chains: [CHAIN],
      user: member,
      today: TODAY,
    });

    expect(trigger.savingPerMonth).toBe(10);
  });

  test('giver kun besked igen, når et Tilbud er billigere end det, der sidst gav besked', () => {
    const centers = [center('a', [offer({ standardPrice: 249 })])];
    const notified = markCurrentMembershipAlertNotified(newCurrentMembershipAlert(), 249);
    const run = (alert, list = centers) =>
      currentMembershipAlertTrigger({
        alert,
        centers: list,
        chains: [CHAIN],
        user: member,
        today: TODAY,
      });

    expect(run(notified)).toBeNull();
    expect(run(notified, [center('b', [offer({ standardPrice: 229 })])]).centerId).toBe('b');
  });

  test('uden alarm eller uden Nuværende medlemskab udløses intet', () => {
    const centers = [center('a', [offer({ standardPrice: 99 })])];

    expect(
      currentMembershipAlertTrigger({
        alert: null,
        centers,
        chains: [CHAIN],
        user: member,
        today: TODAY,
      }),
    ).toBeNull();
    expect(
      currentMembershipAlertTrigger({
        alert: newCurrentMembershipAlert(),
        centers,
        chains: [CHAIN],
        user: USER,
        today: TODAY,
      }),
    ).toBeNull();
  });

  test('gemmes og læses i databasens form; ny tærskel beholder sidste besked', () => {
    const alert = newCurrentMembershipAlert({
      thresholdPerMonth: 50,
      now: new Date('2026-10-22T10:00:00.000Z'),
    });

    expect(alert).toEqual({
      thresholdPerMonth: 50,
      enabledAt: '2026-10-22T10:00:00.000Z',
      notifiedHonestYearlyPrice: null,
    });
    // Databasen gemmer ikke null.
    expect(fromStoredCurrentMembershipAlert({ enabledAt: alert.enabledAt })).toEqual({
      ...alert,
      thresholdPerMonth: null,
    });
    expect(fromStoredCurrentMembershipAlert(null)).toBeNull();

    const changed = changeCurrentMembershipThreshold(
      markCurrentMembershipAlertNotified(alert, 249),
      null,
    );
    expect(changed).toMatchObject({ thresholdPerMonth: null, notifiedHonestYearlyPrice: 249 });
  });
});

describe('fælles', () => {
  test('ved om brugeren har en Prisalarm slået til', () => {
    const plain = { a: newFavorite({ honestYearlyPrice: 300 }) };

    expect(hasAnyPriceAlert({ favorites: plain, currentMembershipAlert: null })).toBe(false);
    const withAlert = { b: favoriteWithAlert(300, null) };
    expect(hasAnyPriceAlert({ favorites: withAlert, currentMembershipAlert: null })).toBe(true);
    expect(
      hasAnyPriceAlert({ favorites: {}, currentMembershipAlert: newCurrentMembershipAlert() }),
    ).toBe(true);
  });

  test('beskeden nævner Center, pris og Besparelse og bærer Centrets id', () => {
    const favoriteMessage = priceAlertMessage({
      kind: 'favorite',
      centerId: 'a',
      centerName: 'SATS Nørrebro',
      honestYearlyPrice: 249.4,
      previousPrice: 300,
      savingPerMonth: 50.6,
    });
    const membershipMessage = priceAlertMessage({
      kind: 'currentMembership',
      centerId: 'b',
      centerName: 'PureGym Amager',
      honestYearlyPrice: 199,
      savingPerMonth: 150,
    });

    expect(favoriteMessage).toEqual({
      title: 'Prisfald: SATS Nørrebro',
      body: 'Ærlig årspris er faldet 51 kr/md til 249 kr/md.',
      data: { centerId: 'a', kind: 'favorite' },
    });
    expect(membershipMessage.title).toBe('Spar 150 kr/md');
    expect(membershipMessage.body).toContain('PureGym Amager koster 199 kr/md');
    expect(membershipMessage.data).toEqual({ centerId: 'b', kind: 'currentMembership' });
  });

  test('læser Centrets id fra en notifikation', () => {
    expect(centerIdFromNotification({ centerId: 'sats-norrebro' })).toBe('sats-norrebro');
    expect(centerIdFromNotification({})).toBeNull();
    expect(centerIdFromNotification(undefined)).toBeNull();
  });
});
