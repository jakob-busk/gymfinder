// Matchning: beregner hvad netop denne bruger reelt kommer til at betale i hvert Center,
// filtrerer og sorterer Centrene og udpeger det Anbefalede.
//
// Modulet er ren JavaScript uden afhængighed af React Native eller Expo, så det kan bruges
// både i appen (Find, Centerdetalje, Favoritter, Ronnie) og af nat-jobbet (prisalarmer).
// Al terminologi følger CONTEXT.md. Kode-navnene er engelske oversættelser:
//
//   Kæde = chain, Center = center, Tilbud = offer, Rabat = discount, Rabatgruppe = group,
//   Rabatprofil = user.discountGroups, Ærlig årspris = honestYearlyPrice,
//   Kvartalspris = quarterlyPrice, Standardpris = standardPrice, Kampagnepris = campaignPrice,
//   Kampagneperiode = campaignMonths, Oprettelsesgebyr = signupFee, Admingebyr = adminFee,
//   Binding = bindingMonths, Makkerpris = partnerPrice, Abonnementstype = subscriptionType,
//   Nuværende medlemskab = user.currentMembership, Spar mere-forslag = savingsSuggestions.
//
// Domænemodellen (input):
//
//   Kæde:   { id, name, website, discounts: [Rabat] }
//   Rabat:  { group, price? | percentOff?, months?, subscriptionTypes?, signupFee? }
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
//   Bruger: { birthDate: 'YYYY-MM-DD', discountGroups: ['student', ...],
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
function optionsFor(offer, chain, groups, ageGroups) {
  const signupFee = offer.signupFee ?? 0;
  const standard = (i) => standardPriceFor(offer, ageGroups[i]);

  const hasCampaign = offer.campaignPrice != null && (offer.campaignMonths ?? 0) > 0;
  const options = [
    {
      id: hasCampaign ? 'campaign' : 'standard',
      kind: hasCampaign ? 'campaign' : 'standard',
      group: null,
      label: hasCampaign ? 'Kampagnepris' : 'Standardpris',
      signupFee,
      month: (i) =>
        hasCampaign && i < offer.campaignMonths
          ? { price: offer.campaignPrice, kind: 'campaign' }
          : { price: standard(i), kind: 'standard' },
    },
  ];

  for (const discount of chain?.discounts ?? []) {
    if (!groups.includes(discount.group) || !discountAppliesTo(discount, offer)) continue;
    const months = discount.months ?? MONTHS_IN_YEAR;
    options.push({
      id: `discount-${discount.group}`,
      kind: 'discount',
      group: discount.group,
      label: DISCOUNT_GROUPS[discount.group]?.optionLabel ?? 'Rabat',
      signupFee: discount.signupFee ?? signupFee,
      month: (i) => {
        if (i >= months) return { price: standard(i), kind: 'standard' };
        const price =
          discount.price != null ? discount.price : standard(i) * (1 - (discount.percentOff ?? 0) / 100);
        return { price, kind: 'discount' };
      },
    });
  }

  if (offer.partnerPrice != null && groups.includes('partner')) {
    options.push({
      id: 'partner',
      kind: 'partner',
      group: 'partner',
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
  return { id: option.id, kind: option.kind, group: option.group, label: option.label };
}

// Prissætter ét Tilbud for brugeren. 12- og 3-måneders-vinduet vælger hver sin billigste mulighed.
function priceOffer(offer, chain, groups, ageGroups) {
  const priced = optionsFor(offer, chain, groups, ageGroups).map((option) => {
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
  const turns30Index = ageGroups.findIndex((group, i) => i > 0 && group === 'over30' && ageGroups[i - 1] === 'under30');
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

// ---------- Matchning ----------

export function matchCenters({ centers, chains, user, today }) {
  const todayDate = toDate(today ?? new Date());
  const groups = user?.discountGroups ?? [];
  const ageGroups = ageGroupsForWindow(user?.birthDate, todayDate);
  const chainsById = Object.fromEntries((chains ?? []).map((chain) => [chain.id, chain]));

  const results = (centers ?? []).map((center) => {
    const chain = chainsById[center.chainId] ?? null;
    const offers = (center.offers ?? []).map((offer) => priceOffer(offer, chain, groups, ageGroups));
    const bestOffer = cheapest(offers, 'honestYearlyPrice');
    return { center, chain, offers, bestOffer, honestYearlyPrice: bestOffer.honestYearlyPrice };
  });

  return { centers: results };
}
