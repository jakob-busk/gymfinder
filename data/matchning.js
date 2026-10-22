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
//   Binding = bindingMonths, Makkerpris = partnerPrice, Makkerprisens kampagne =
//   partnerCampaignPrice / partnerCampaignMonths, Abonnementstype = subscriptionType,
//   Nuværende medlemskab = user.currentMembership, Spar mere-forslag = savingSuggestions.
//
// Domænemodellen (input):
//
//   Kæde:   { id, name, website, discounts: [Rabat] }
//   Rabat:  { discountGroup, price? | percentOff?, months?, subscriptionTypes?, offerNames?,
//             signupFee? }
//           price = fast pris pr. betaling, percentOff = procent af Standardprisen.
//           months = Rabatperiode i betalingsperioder (udeladt = hele året).
//           subscriptionTypes / offerNames = kun disse Abonnementstyper / Tilbud (udeladt = alle).
//           Samme Rabatgruppe kan have flere Rabatter med forskellig sats pr. Tilbud.
//           signupFee = særligt Oprettelsesgebyr (fx 0 = gratis oprettelse).
//   Center: { id, chainId, name, address, location: { latitude, longitude },
//             facilities: { sauna, groupClasses, open24h }, machines, signupUrl, offers: [Tilbud] }
//           Faciliteter er true/false/null. null eller manglende nøgle = ukendt ("Ikke oplyst");
//           kun false betyder nej. machines = liste eller null (ukendt).
//   Tilbud: { id, name, subscriptionType, standardPrice, campaignPrice, campaignMonths,
//             signupFee, adminFee, bindingMonths, partnerPrice, partnerRequirement,
//             partnerCampaignPrice?, partnerCampaignMonths?, partnerSignupFee?,
//             billingIntervalDays? }
//           standardPrice, campaignPrice, partnerPrice og partnerCampaignPrice er hver et tal
//           (samme pris for alle) eller { under30, over30 } (pris pr. Aldersgruppe).
//           partnerCampaignPrice gælder de første partnerCampaignMonths betalingsperioder for
//           Træn med en makker; derefter gælder partnerPrice.
//           partnerSignupFee = Oprettelsesgebyr pr. person for Træn med en makker (udeladt =
//           Tilbuddets signupFee).
//           billingIntervalDays = opkrævning pr. N dage (fx 30 hos LOOP); udeladt = pr. måned.
//           Priser, Admingebyr og campaignMonths gælder pr. betalingsperiode.
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
const DAYS_IN_YEAR = 365;

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

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// Antal betalinger pr. år. De fleste Kæder opkræver pr. måned; nogle (fx LOOP) pr. 30 dage,
// hvilket giver 365 / 30 ≈ 12,17 betalinger om året.
function paymentsPerYearFor(offer) {
  return offer.billingIntervalDays ? DAYS_IN_YEAR / offer.billingIntervalDays : MONTHS_IN_YEAR;
}

// Aldersgruppe for hver betalingsperiode i det første år. Periode i dækker
// [start(i), start(i + 1)). Fylder brugeren 30 i løbet af en periode, gælder 30+-prisen
// fra og med den periode. Kendes fødselsdatoen ikke, regnes med 30+ (den højeste pris),
// så prisen aldrig bliver for lav.
function ageGroupsForWindow(offer, birthDate, today) {
  const count = Math.ceil(paymentsPerYearFor(offer));
  if (!birthDate) return Array(count).fill('over30');
  const start = (i) =>
    offer.billingIntervalDays ? addDays(today, i * offer.billingIntervalDays) : addMonths(today, i);
  const turns30 = addMonths(toDate(birthDate), 30 * MONTHS_IN_YEAR);
  return Array.from({ length: count }, (_, i) => (turns30 < start(i + 1) ? 'over30' : 'under30'));
}

// ---------- Priser ----------

// En pris er enten ét tal for alle eller { under30, over30 } pr. Aldersgruppe.
function priceForAgeGroup(price, ageGroup) {
  if (price == null || typeof price === 'number') return price;
  return price[ageGroup];
}

const variesByAgeGroup = (price) => price != null && typeof price === 'object';

function standardPriceFor(offer, ageGroup) {
  return priceForAgeGroup(offer.standardPrice, ageGroup);
}

// En Rabat kan afgrænses til bestemte Abonnementstyper og/eller Tilbud (efter navn),
// fordi satsen hos nogle Kæder afhænger af medlemskabet (fx PureGym Core 15 %, Unlimited 25 %).
function discountAppliesTo(discount, offer) {
  const typeOk =
    !discount.subscriptionTypes || discount.subscriptionTypes.includes(offer.subscriptionType);
  const nameOk = !discount.offerNames || discount.offerNames.includes(offer.name);
  return typeOk && nameOk;
}

const hasPartnerCampaignFor = (offer) =>
  offer.partnerCampaignPrice != null && (offer.partnerCampaignMonths ?? 0) > 0;

// Makkerprisen for brugeren i første betalingsperiode, eller null uden Makkerpris.
// { price, campaign: { price, months } | null, signupFee }. Bruges til visning.
function partnerSummary(offer, ageGroup) {
  if (offer.partnerPrice == null) return null;
  return {
    price: priceForAgeGroup(offer.partnerPrice, ageGroup),
    campaign: hasPartnerCampaignFor(offer)
      ? {
          price: priceForAgeGroup(offer.partnerCampaignPrice, ageGroup),
          months: offer.partnerCampaignMonths,
        }
      : null,
    signupFee: offer.partnerSignupFee ?? offer.signupFee ?? 0,
  };
}

// Alle de muligheder brugeren har ret til for et Tilbud. Hver mulighed er en pris pr.
// betalingsperiode. Muligheder lægges aldrig sammen: Rabatter regnes af Standardprisen,
// ikke af Kampagneprisen. Kampagne- og Rabatperioder tælles i betalingsperioder.
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
          ? { price: priceForAgeGroup(offer.campaignPrice, ageGroups[i]), kind: 'campaign' }
          : { price: standard(i), kind: 'standard' },
    },
  ];

  for (const discount of chain?.discounts ?? []) {
    if (!profile.includes(discount.discountGroup) || !discountAppliesTo(discount, offer)) continue;
    const months = discount.months ?? Infinity;
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

  // Træn med en makker: Makkerpris (evt. med sin egen kampagne de første perioder) og
  // eventuelt et særligt Oprettelsesgebyr, fx Fitness X' engangsbeløb for at tilføje makkeren.
  if (offer.partnerPrice != null && profile.includes('partner')) {
    const hasPartnerCampaign = hasPartnerCampaignFor(offer);
    options.push({
      id: 'partner',
      kind: 'partner',
      discountGroup: 'partner',
      label: DISCOUNT_GROUPS.partner.optionLabel,
      signupFee: offer.partnerSignupFee ?? signupFee,
      month: (i) =>
        hasPartnerCampaign && i < offer.partnerCampaignMonths
          ? {
              price: priceForAgeGroup(offer.partnerCampaignPrice, ageGroups[i]),
              kind: 'partnerCampaign',
            }
          : { price: priceForAgeGroup(offer.partnerPrice, ageGroups[i]), kind: 'partner' },
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
// Vinduet rummer `payments` betalinger; en brøkdel betyder en delvis sidste betaling
// (fx 12,17 betalinger pr. år ved betaling pr. 30 dage).
function averageOver(breakdown, signupFee, months, payments) {
  const full = Math.floor(payments);
  const partial = payments - full;
  const sum =
    breakdown.slice(0, full).reduce((total, period) => total + period.total, 0) +
    (partial > 0 ? partial * breakdown[full].total : 0);
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
function priceOffer(offer, chain, profile, birthDate, today) {
  const ageGroups = ageGroupsForWindow(offer, birthDate, today);
  const paymentsPerYear = paymentsPerYearFor(offer);
  const paymentsPerQuarter = (paymentsPerYear * MONTHS_IN_QUARTER) / MONTHS_IN_YEAR;
  const priced = optionsFor(offer, chain, profile, ageGroups).map((option) => {
    const breakdown = breakdownFor(option, offer, ageGroups);
    const { signupFee } = option;
    return {
      option,
      breakdown,
      honestYearlyPrice: averageOver(breakdown, signupFee, MONTHS_IN_YEAR, paymentsPerYear),
      quarterlyPrice: averageOver(breakdown, signupFee, MONTHS_IN_QUARTER, paymentsPerQuarter),
    };
  });

  const yearly = cheapest(priced, 'honestYearlyPrice');
  const quarterly = cheapest(priced, 'quarterlyPrice');
  const turns30Index = ageGroups.findIndex(
    (group, i) => i > 0 && group === 'over30' && ageGroups[i - 1] === 'under30',
  );
  const ageMatters = [
    offer.standardPrice,
    offer.campaignPrice,
    offer.partnerPrice,
    offer.partnerCampaignPrice,
  ].some(variesByAgeGroup);

  return {
    offer,
    honestYearlyPrice: yearly.honestYearlyPrice,
    quarterlyPrice: quarterly.quarterlyPrice,
    yearlyOption: describeOption(yearly.option),
    quarterlyOption: describeOption(quarterly.option),
    monthlyBreakdown: yearly.breakdown,
    paymentsPerYear,
    signupFee: yearly.option.signupFee,
    adminFee: offer.adminFee ?? 0,
    bindingMonths: offer.bindingMonths ?? null,
    turns30InMonth: ageMatters && turns30Index >= 0 ? turns30Index + 1 : null,
    partnerRequirement: offer.partnerRequirement ?? null,
    partner: partnerSummary(offer, ageGroups[0]),
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
function savingSuggestionsFor(offers, chain, user, profile, today, currentBest) {
  const age = user?.birthDate ? ageOn(toDate(user.birthDate), today) : null;

  return Object.entries(DISCOUNT_GROUPS)
    .filter(
      ([discountGroup, info]) =>
        info.membershipPricePerYear != null && !profile.includes(discountGroup),
    )
    .filter(([, info]) => info.minAge == null || age == null || age >= info.minAge)
    .map(([discountGroup, info]) => {
      const withGroup = offers.map((offer) =>
        priceOffer(offer, chain, [...profile, discountGroup], user?.birthDate, today),
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
//                 monthlyBreakdown, paymentsPerYear, signupFee, adminFee, bindingMonths, turns30InMonth,
//                 partnerRequirement, partner, notStated }
//   partner = { price, campaign: { price, months } | null, signupFee } for brugerens
//             Aldersgruppe i første periode, eller null, når Tilbuddet ikke har en Makkerpris.
//
// bestOffer er Tilbuddet med lavest Ærlig årspris. quarterlyPrice på Centret er den laveste
// Kvartalspris blandt Centrets Tilbud. Priser er ikke afrundede; afrund først ved visning.
export function matchCenters({ centers, chains, user, filters, sortBy, location, today }) {
  const activeFilters = filters ?? {};
  const todayDate = toDate(today ?? new Date());
  const profile = user?.discountProfile ?? [];
  const chainsById = Object.fromEntries((chains ?? []).map((chain) => [chain.id, chain]));
  const currentPrice = user?.currentMembership?.monthlyPrice ?? null;

  const results = [];
  for (const center of centers ?? []) {
    const distance = distanceKm(location, center.location);
    const maxDistance = activeFilters.maxDistanceKm;
    // Maks. afstand er altid hård: kan Distance ikke beregnes (Centret eller brugeren mangler
    // koordinater), vides det ikke, om Centret ligger inden for, og det skjules.
    if (maxDistance != null && (distance == null || distance > maxDistance)) continue;

    const centerCheck = checkCenter(center, activeFilters);
    if (centerCheck.fail) continue;

    const chain = chainsById[center.chainId] ?? null;
    const eligibleOffers = (center.offers ?? []).filter(
      (offer) => !checkOffer(offer, activeFilters).fail,
    );
    if (eligibleOffers.length === 0) continue;

    const offers = eligibleOffers
      .map((offer) => ({
        ...priceOffer(offer, chain, profile, user?.birthDate, todayDate),
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
