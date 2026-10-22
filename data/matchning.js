// Matchning: beregner hvad netop denne bruger reelt kommer til at betale i hvert Center,
// filtrerer og sorterer Centrene og udpeger det Anbefalede.
//
// Modulet er ren JavaScript uden afhængighed af React Native eller Expo, så det kan bruges
// både i appen (Find, Centerdetalje, Favoritter, Ronnie) og af nat-jobbet (prisalarmer).
// Al terminologi følger CONTEXT.md. Kode-navnene er engelske oversættelser:
//
//   Kæde = chain, Center = center, Tilbud = offer, Rabat = discount, Rabatgruppe = discountGroup,
//   Rabatprofil = user.discountProfile, Ærlig årspris = honestYearlyPrice,
//   Kvartalspris = quarterlyPrice, Standardpris = standardPrice, Kampagnepris = campaignPrice,
//   Kampagneperiode = campaignMonths, Oprettelsesgebyr = signupFee, Admingebyr = adminFee,
//   Binding = bindingMonths, Makkerpris = partnerPrice, Abonnementstype = subscriptionType,
//   Nuværende medlemskab = user.currentMembership, Spar mere-forslag = savingSuggestions.
//
// Domænemodellen (input):
//
//   Kæde:   { id, name, website, discounts: [Rabat] }
//   Rabat:  { discountGroup, price? | percentOff?, months?, subscriptionTypes?, signupFee? }
//           price = fast månedspris, percentOff = procent af Standardprisen.
//           months = Rabatperiode (udeladt = hele året). subscriptionTypes = kun disse
//           Abonnementstyper (udeladt = alle). signupFee = særligt Oprettelsesgebyr.
//   Center: { id, chainId, name, address, location: { latitude, longitude },
//             facilities: { sauna, groupClasses, open24h }, machines, signupUrl, offers: [Tilbud] }
//           Faciliteter er true/false/null (null = ukendt). machines = liste eller null (ukendt).
//   Tilbud: { id, name, subscriptionType, standardPrice, campaignPrice, campaignMonths,
//             signupFee, adminFee, bindingMonths, partnerPrice, partnerRequirement }
//           standardPrice er et tal eller { under30, over30 } (Aldersgruppe).
//           bindingMonths = null betyder ukendt.
//   Bruger: { birthDate: 'YYYY-MM-DD', discountProfile: ['student', ...],
//             currentMembership: { monthlyPrice, chainId? } | null }

// Rabatgrupperne. Kun grupper med en medlemspris kan man "melde sig ind i" (Spar mere-forslag).
export const DISCOUNT_GROUPS = {
  student: { label: 'Studerende', optionLabel: 'Studierabat' },
  senior: { label: 'Senior/pensionist', optionLabel: 'Seniorrabat' },
  aeldreSagen: {
    label: 'Ældre Sagen-medlem',
    optionLabel: 'Ældre Sagen-rabat',
    membershipPricePerYear: 310,
    minAge: 18,
  },
  partner: { label: 'Træn med en makker', optionLabel: 'Makkerpris' },
};

export const SORT_OPTIONS = [
  { id: 'honestYearlyPrice', label: 'Ærlig årspris' },
  { id: 'quarterlyPrice', label: 'Kvartalspris' },
  { id: 'priceDesc', label: 'Pris høj→lav' },
  { id: 'distance', label: 'Afstand' },
];

const MONTHS_IN_YEAR = 12;
const MONTHS_IN_QUARTER = 3;

// ---------- Datoer (UTC, så tidszoner ikke flytter en dag) ----------

function toDate(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

function ageOn(birthDate, date) {
  const age = date.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayThisYear = addMonths(birthDate, age * MONTHS_IN_YEAR);
  return date < birthdayThisYear ? age - 1 : age;
}

// Aldersgruppe for hver af de 12 måneder. Måned i dækker [i dag + i mdr., i dag + i+1 mdr.).
// Fylder brugeren 30 i løbet af en måned, gælder 30+-prisen fra og med den måned.
// Kendes fødselsdatoen ikke, regnes med 30+ (den højeste pris), så prisen aldrig er for lav.
function ageGroupsForWindow(birthDate, today) {
  if (!birthDate) return Array(MONTHS_IN_YEAR).fill('over30');
  const turns30 = addMonths(toDate(birthDate), 30 * MONTHS_IN_YEAR);
  return Array.from({ length: MONTHS_IN_YEAR }, (_, i) =>
    turns30 < addMonths(today, i + 1) ? 'over30' : 'under30',
  );
}

// ---------- Priser ----------

function standardPriceFor(offer, ageGroup) {
  if (typeof offer.standardPrice === 'number') return offer.standardPrice;
  return offer.standardPrice[ageGroup];
}

function discountAppliesTo(discount, offer) {
  return !discount.subscriptionTypes || discount.subscriptionTypes.includes(offer.subscriptionType);
}

// Alle de muligheder brugeren har ret til for et Tilbud. Hver mulighed er en pris pr. måned
// for de 12 måneder. Muligheder lægges aldrig sammen: Rabatter regnes af Standardprisen,
// ikke af Kampagneprisen.
function optionsFor(offer, chain, profile, ageGroups) {
  const signupFee = offer.signupFee ?? 0;
  const standard = (i) => standardPriceFor(offer, ageGroups[i]);

  const hasCampaign = offer.campaignPrice != null && (offer.campaignMonths ?? 0) > 0;
  const options = [
    {
      id: hasCampaign ? 'campaign' : 'standard',
      kind: hasCampaign ? 'campaign' : 'standard',
      discountGroup: null,
      label: hasCampaign ? 'Kampagnepris' : 'Standardpris',
      signupFee,
      month: (i) =>
        hasCampaign && i < offer.campaignMonths
          ? { price: offer.campaignPrice, kind: 'campaign' }
          : { price: standard(i), kind: 'standard' },
    },
  ];

  for (const discount of chain?.discounts ?? []) {
    if (!profile.includes(discount.discountGroup) || !discountAppliesTo(discount, offer)) continue;
    const months = discount.months ?? MONTHS_IN_YEAR;
    options.push({
      id: `discount-${discount.discountGroup}`,
      kind: 'discount',
      discountGroup: discount.discountGroup,
      label: DISCOUNT_GROUPS[discount.discountGroup]?.optionLabel ?? 'Rabat',
      signupFee: discount.signupFee ?? signupFee,
      month: (i) => {
        if (i >= months) return { price: standard(i), kind: 'standard' };
        const price =
          discount.price != null
            ? discount.price
            : standard(i) * (1 - (discount.percentOff ?? 0) / 100);
        return { price, kind: 'discount' };
      },
    });
  }

  if (offer.partnerPrice != null && profile.includes('partner')) {
    options.push({
      id: 'partner',
      kind: 'partner',
      discountGroup: 'partner',
      label: DISCOUNT_GROUPS.partner.optionLabel,
      signupFee,
      month: () => ({ price: offer.partnerPrice, kind: 'partner' }),
    });
  }

  return options;
}

function breakdownFor(option, offer, ageGroups) {
  const adminFee = offer.adminFee ?? 0;
  return ageGroups.map((ageGroup, i) => {
    const { price, kind } = option.month(i);
    return { month: i + 1, price, adminFee, total: price + adminFee, kind, ageGroup };
  });
}

// Gennemsnitlig pris pr. måned over de første `months` måneder inkl. Oprettelsesgebyr.
function averageOver(breakdown, signupFee, months) {
  const sum = breakdown.slice(0, months).reduce((total, month) => total + month.total, 0);
  return (signupFee + sum) / months;
}

function cheapest(items, key) {
  return items.reduce((best, item) => (item[key] < best[key] ? item : best));
}

function describeOption(option) {
  return {
    id: option.id,
    kind: option.kind,
    discountGroup: option.discountGroup,
    label: option.label,
  };
}

// Prissætter ét Tilbud for brugeren. 12- og 3-måneders-vinduet vælger hver sin billigste mulighed.
function priceOffer(offer, chain, profile, ageGroups) {
  const priced = optionsFor(offer, chain, profile, ageGroups).map((option) => {
    const breakdown = breakdownFor(option, offer, ageGroups);
    return {
      option,
      breakdown,
      honestYearlyPrice: averageOver(breakdown, option.signupFee, MONTHS_IN_YEAR),
      quarterlyPrice: averageOver(breakdown, option.signupFee, MONTHS_IN_QUARTER),
    };
  });

  const yearly = cheapest(priced, 'honestYearlyPrice');
  const quarterly = cheapest(priced, 'quarterlyPrice');
  const turns30Index = ageGroups.findIndex(
    (group, i) => i > 0 && group === 'over30' && ageGroups[i - 1] === 'under30',
  );
  const ageMatters = typeof offer.standardPrice !== 'number';

  return {
    offer,
    honestYearlyPrice: yearly.honestYearlyPrice,
    quarterlyPrice: quarterly.quarterlyPrice,
    yearlyOption: describeOption(yearly.option),
    quarterlyOption: describeOption(quarterly.option),
    monthlyBreakdown: yearly.breakdown,
    signupFee: yearly.option.signupFee,
    adminFee: offer.adminFee ?? 0,
    bindingMonths: offer.bindingMonths ?? null,
    turns30InMonth: ageMatters && turns30Index >= 0 ? turns30Index + 1 : null,
    partnerRequirement: offer.partnerRequirement ?? null,
  };
}

// ---------- Distance ----------

const EARTH_RADIUS_KM = 6371;

// Luftlinje mellem to punkter (haversine).
export function distanceKm(from, to) {
  if (!from || !to) return null;
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = rad(to.latitude - from.latitude);
  const dLon = rad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// ---------- Filtre ----------
//
// Filtre: { maxDistanceKm, sauna, groupClasses, open24h, machines: [], noBinding, multiCenterAccess }
// Et Filter er kun aktivt, når det er sat (true / ikke-tom liste / et tal).
// Hvert tjek giver 'fail' (med sikkerhed ikke opfyldt, skjules), 'unknown' ("Ikke oplyst") eller 'ok'.

export const FACILITY_FILTERS = ['sauna', 'groupClasses', 'open24h'];

// Navne til "Ikke oplyst"-mærker i UI.
export const NOT_STATED_LABELS = {
  sauna: 'Sauna',
  groupClasses: 'Holdtræning',
  open24h: 'Døgnåbent',
  machines: 'Maskiner',
  binding: 'Binding',
  subscriptionType: 'Abonnementstype',
};

function checkCenter(center, filters) {
  const notStated = [];
  for (const facility of FACILITY_FILTERS) {
    if (filters[facility] !== true) continue;
    const value = center.facilities?.[facility];
    if (value === false) return { fail: true };
    if (value == null) notStated.push(facility);
  }

  const wantedMachines = filters.machines ?? [];
  if (wantedMachines.length > 0) {
    if (center.machines == null) notStated.push('machines');
    else if (!wantedMachines.every((machine) => center.machines.includes(machine)))
      return { fail: true };
  }

  return { fail: false, notStated };
}

function checkOffer(offer, filters) {
  const notStated = [];
  if (filters.noBinding === true) {
    if (offer.bindingMonths == null) notStated.push('binding');
    else if (offer.bindingMonths > 0) return { fail: true };
  }
  if (filters.multiCenterAccess === true) {
    if (offer.subscriptionType == null) notStated.push('subscriptionType');
    else if (offer.subscriptionType !== 'Landsdækkende') return { fail: true };
  }
  return { fail: false, notStated };
}

// ---------- Spar mere-forslag ----------

// Rabatgrupper brugeren kan melde sig ind i, hvor Besparelsen i dette Center er større
// end medlemsprisen (fx Ældre Sagen 310 kr/år).
function savingSuggestionsFor(offers, chain, user, profile, ageGroups, today, currentBest) {
  const age = user?.birthDate ? ageOn(toDate(user.birthDate), today) : null;

  return Object.entries(DISCOUNT_GROUPS)
    .filter(
      ([discountGroup, info]) =>
        info.membershipPricePerYear != null && !profile.includes(discountGroup),
    )
    .filter(([, info]) => info.minAge == null || age == null || age >= info.minAge)
    .map(([discountGroup, info]) => {
      const withGroup = offers.map((offer) =>
        priceOffer(offer, chain, [...profile, discountGroup], ageGroups),
      );
      const best = cheapest(withGroup, 'honestYearlyPrice');
      return {
        discountGroup,
        label: info.label,
        membershipPricePerYear: info.membershipPricePerYear,
        offerId: best.offer.id,
        honestYearlyPrice: best.honestYearlyPrice,
        savingPerYear: (currentBest - best.honestYearlyPrice) * MONTHS_IN_YEAR,
      };
    })
    .filter((suggestion) => suggestion.savingPerYear > suggestion.membershipPricePerYear);
}

// ---------- Sortering ----------

const COMPARATORS = {
  honestYearlyPrice: (a, b) => a.honestYearlyPrice - b.honestYearlyPrice,
  quarterlyPrice: (a, b) => a.quarterlyPrice - b.quarterlyPrice,
  priceDesc: (a, b) => b.honestYearlyPrice - a.honestYearlyPrice,
  distance: (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
};

function sortCenters(results, sortBy) {
  const compare = COMPARATORS[sortBy] ?? COMPARATORS.honestYearlyPrice;
  return [...results].sort(
    (a, b) =>
      compare(a, b) ||
      a.honestYearlyPrice - b.honestYearlyPrice ||
      String(a.center.id).localeCompare(String(b.center.id)),
  );
}

// ---------- Matchning ----------

// Input:  { centers, chains, user, filters, sortBy, location, today }
// Output: { centers: [CenterMatch], recommendedId, recommendedOfferId }
//
// CenterMatch: { center, chain, distanceKm, offers: [PrisetTilbud], bestOffer, honestYearlyPrice,
//                quarterlyPrice, notStated, isSureMatch, bestSureOffer, savingSuggestions,
//                savingPerMonth }
//   notStated = aktive Filtre, der er "Ikke oplyst" for Centret / det billigste Tilbud.
//   savingPerMonth = Besparelse i forhold til Nuværende medlemskab (null hvis intet).
// PrisetTilbud: { offer, honestYearlyPrice, quarterlyPrice, yearlyOption, quarterlyOption,
//                 monthlyBreakdown, signupFee, adminFee, bindingMonths, turns30InMonth,
//                 partnerRequirement, notStated }
//
// bestOffer er Tilbuddet med lavest Ærlig årspris. quarterlyPrice på Centret er den laveste
// Kvartalspris blandt Centrets Tilbud. Priser er ikke afrundede; afrund først ved visning.
export function matchCenters({ centers, chains, user, filters, sortBy, location, today }) {
  const activeFilters = filters ?? {};
  const todayDate = toDate(today ?? new Date());
  const profile = user?.discountProfile ?? [];
  const ageGroups = ageGroupsForWindow(user?.birthDate, todayDate);
  const chainsById = Object.fromEntries((chains ?? []).map((chain) => [chain.id, chain]));
  const currentPrice = user?.currentMembership?.monthlyPrice ?? null;

  const results = [];
  for (const center of centers ?? []) {
    const distance = distanceKm(location, center.location);
    const maxDistance = activeFilters.maxDistanceKm;
    if (maxDistance != null && distance != null && distance > maxDistance) continue;

    const centerCheck = checkCenter(center, activeFilters);
    if (centerCheck.fail) continue;

    const chain = chainsById[center.chainId] ?? null;
    const eligibleOffers = (center.offers ?? []).filter(
      (offer) => !checkOffer(offer, activeFilters).fail,
    );
    if (eligibleOffers.length === 0) continue;

    const offers = eligibleOffers
      .map((offer) => ({
        ...priceOffer(offer, chain, profile, ageGroups),
        notStated: checkOffer(offer, activeFilters).notStated,
      }))
      .sort((a, b) => a.honestYearlyPrice - b.honestYearlyPrice);
    const bestOffer = offers[0];
    const sureOffers =
      centerCheck.notStated.length === 0 ? offers.filter((o) => o.notStated.length === 0) : [];

    results.push({
      center,
      chain,
      distanceKm: distance,
      offers,
      bestOffer,
      honestYearlyPrice: bestOffer.honestYearlyPrice,
      quarterlyPrice: cheapest(offers, 'quarterlyPrice').quarterlyPrice,
      notStated: [...centerCheck.notStated, ...bestOffer.notStated],
      isSureMatch: sureOffers.length > 0,
      bestSureOffer: sureOffers[0] ?? null,
      savingSuggestions: savingSuggestionsFor(
        eligibleOffers,
        chain,
        user,
        profile,
        ageGroups,
        todayDate,
        bestOffer.honestYearlyPrice,
      ),
      savingPerMonth: currentPrice == null ? null : currentPrice - bestOffer.honestYearlyPrice,
    });
  }

  // Anbefalet: lavest Ærlig årspris blandt sikre match, uafhængig af sorteringen.
  const sure = results.filter((result) => result.isSureMatch);
  const recommended =
    sure.length > 0
      ? sure.reduce((best, r) =>
          r.bestSureOffer.honestYearlyPrice < best.bestSureOffer.honestYearlyPrice ? r : best,
        )
      : null;

  return {
    centers: sortCenters(results, sortBy),
    recommendedId: recommended?.center.id ?? null,
    recommendedOfferId: recommended?.bestSureOffer.offer.id ?? null,
  };
}
