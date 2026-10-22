// Centerdetalje: ren visningslogik til ét Center (prisudregning måned for måned, 30-års-advarsel,
// gebyrer, Makkerpris, faciliteter og tilmeldingslink). Ren JavaScript uden React Native eller
// Expo, så den kan testes direkte. Alle priser kommer fra Matchning (data/matchning.js); her
// regnes intet nyt, der kun stilles op, så udregningen kan vises og stemmer med Ærlig årspris.

import { FACILITY_FILTERS, NOT_STATED_LABELS, matchCenters } from './matchning.js';

const MONTHS_IN_YEAR = 12;

const MONTH_NAMES = [
  'januar',
  'februar',
  'marts',
  'april',
  'maj',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'december',
];

// Beløb i kroner med dansk tegnsætning: 1.234 kr, 224,50 kr.
export function formatKr(amount) {
  const rounded = Math.round(amount * 100) / 100;
  const [whole, decimals] = Math.abs(rounded).toFixed(2).split('.');
  const withDots = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${withDots}${decimals === '00' ? '' : `,${decimals}`} kr`;
}

// Matchning for ét Center uden Filtre, så Centerdetalje viser alle Centrets Tilbud, også dem
// brugerens Filtre ellers ville skjule på Find. Returnerer en CenterMatch eller null.
export function matchCenter({ center, chains, user, today }) {
  if (!center) return null;
  const { centers } = matchCenters({
    centers: [center],
    chains,
    user,
    filters: {},
    location: user?.location ?? null,
    today,
  });
  return centers[0] ?? null;
}

function kindLabel(period, pricedOffer, ageMatters) {
  if (period.kind === 'campaign') return 'Kampagnepris';
  if (period.kind === 'partnerCampaign') return 'Makkerpris (kampagne)';
  if (period.kind === 'discount' || period.kind === 'partner') {
    return pricedOffer.yearlyOption.label;
  }
  if (!ageMatters) return 'Standardpris';
  return period.ageGroup === 'over30' ? 'Standardpris (30+)' : 'Standardpris (under 30)';
}

// Prisudregningen bag Ærlig årspris, én række pr. betaling i det første år.
// Ved betaling pr. 30 dage er der 13 betalinger, hvor kun en del af den sidste falder inden for
// året; share er den andel, der tælles med (1 for alle andre).
// Returnerer { rows, perPeriod, signupFee, paymentsTotal, yearTotal, honestYearlyPrice }.
export function priceBreakdown(pricedOffer) {
  const { monthlyBreakdown, paymentsPerYear, signupFee } = pricedOffer;
  const monthly = paymentsPerYear === MONTHS_IN_YEAR;
  const ageMatters = typeof pricedOffer.offer.standardPrice !== 'number';
  const fullPayments = Math.floor(paymentsPerYear);

  const rows = monthlyBreakdown.map((period, i) => {
    const share = i < fullPayments ? 1 : paymentsPerYear - fullPayments;
    return {
      key: String(period.month),
      label: `${monthly ? 'Måned' : 'Betaling'} ${period.month}`,
      kindLabel: kindLabel(period, pricedOffer, ageMatters),
      price: period.price,
      adminFee: period.adminFee,
      total: period.total,
      share,
      counted: period.total * share,
    };
  });

  const paymentsTotal = rows.reduce((sum, row) => sum + row.counted, 0);
  const yearTotal = signupFee + paymentsTotal;
  return {
    rows: rows.filter((row) => row.share > 0),
    perPeriod: monthly ? 'md' : '30 dage',
    signupFee,
    paymentsTotal,
    yearTotal,
    honestYearlyPrice: yearTotal / MONTHS_IN_YEAR,
  };
}

// Advarsel, når brugeren fylder 30 inden for året, og prisen for den billigste mulighed stiger
// med det. Ingen advarsel, hvis den valgte mulighed har fast pris (fx Makkerpris).
// Returnerer { offerName, birthdayMonth: 'marts 2027', fromPeriod: 5, priceBefore, priceAfter }
// eller null. Priserne er inkl. Admingebyr.
export function turns30Notice(birthDate, pricedOffer) {
  const fromPeriod = pricedOffer?.turns30InMonth;
  if (!birthDate || fromPeriod == null) return null;
  const before = pricedOffer.monthlyBreakdown[fromPeriod - 2];
  const after = pricedOffer.monthlyBreakdown[fromPeriod - 1];
  if (!before || !after || after.total <= before.total) return null;

  const [year, month] = birthDate.split('-').map(Number);
  return {
    offerName: pricedOffer.offer.name,
    birthdayMonth: `${MONTH_NAMES[month - 1]} ${year + 30}`,
    fromPeriod,
    priceBefore: before.total,
    priceAfter: after.total,
  };
}

// Oprettelsesgebyr, Admingebyr og Binding som korte tekster.
export function feeSummary(pricedOffer) {
  const { signupFee, adminFee, bindingMonths } = pricedOffer;
  const perPeriod = pricedOffer.paymentsPerYear === MONTHS_IN_YEAR ? 'md' : '30 dage';
  let binding = 'Ikke oplyst';
  if (bindingMonths === 0) binding = 'Ingen';
  else if (bindingMonths != null) binding = `${bindingMonths} mdr.`;

  return {
    signupFee: signupFee > 0 ? formatKr(signupFee) : 'Gratis',
    adminFee: adminFee > 0 ? `${formatKr(adminFee)} pr. ${perPeriod}` : 'Ingen',
    binding,
  };
}

// Makkerpris for brugere i Rabatgruppen Træn med en makker. null for andre brugere.
// Returnerer { available, price, campaign, signupFee, requirement, isCheapest }; available =
// false, når Tilbuddet ikke har en Makkerpris. price og campaign ({ price, months } | null)
// gælder brugerens Aldersgruppe; signupFee er Oprettelsesgebyret pr. person med en makker.
export function partnerInfo(user, pricedOffer) {
  if (!(user?.discountProfile ?? []).includes('partner')) return null;
  const partner = pricedOffer.partner;
  if (!partner) {
    return {
      available: false,
      price: null,
      campaign: null,
      signupFee: null,
      requirement: null,
      isCheapest: false,
    };
  }
  return {
    available: true,
    price: partner.price,
    campaign: partner.campaign,
    signupFee: partner.signupFee,
    requirement: pricedOffer.partnerRequirement,
    isCheapest: pricedOffer.yearlyOption.kind === 'partner',
  };
}

// Faciliteter og maskiner som Ja / Nej / Ikke oplyst.
export function facilityRows(center) {
  const rows = FACILITY_FILTERS.map((facility) => {
    const value = center?.facilities?.[facility];
    let text = 'Ikke oplyst';
    if (value === true) text = 'Ja';
    else if (value === false) text = 'Nej';
    return { key: facility, label: NOT_STATED_LABELS[facility], value: text };
  });

  const machines = center?.machines;
  rows.push({
    key: 'machines',
    label: NOT_STATED_LABELS.machines,
    value: machines == null ? 'Ikke oplyst' : machines.join(', ') || 'Ingen',
  });
  return rows;
}

// Et tilmeldingslink er én URL eller { under30, over30 } (fx SATS og Fitness X, hvor under 30
// er sit eget medlemskab). Giver linket for Aldersgruppen.
function linkForAgeGroup(link, ageGroup) {
  if (!link || typeof link === 'string') return link || null;
  return link[ageGroup] ?? link.over30 ?? link.under30 ?? null;
}

// Tilbuddets eget tilmeldingslink for brugeren: til netop dette medlemskab i netop dette Center
// i brugerens Aldersgruppe i dag. Er Makkerpris den billigste mulighed, bruges Makkerprisens
// link, hvis Kæden har et. null, hvis Tilbuddet ikke har et link (fx håndindtastede data).
export function offerSignupUrl(pricedOffer) {
  const offer = pricedOffer?.offer;
  if (!offer) return null;
  const ageGroup = pricedOffer.monthlyBreakdown?.[0]?.ageGroup;
  const partnerLink =
    pricedOffer.yearlyOption?.kind === 'partner'
      ? linkForAgeGroup(offer.partnerSignupUrl, ageGroup)
      : null;
  return partnerLink ?? linkForAgeGroup(offer.signupUrl, ageGroup);
}

// Kædens tilmeldingsside med et henvisningslink, så Kæden kan se, at brugeren kom fra GymFinder.
// Bruger Tilbuddets eget link (pricedOffer er et prissat Tilbud fra Matchning), ellers Centrets
// tilmeldingslink og til sidst Kædens hjemmeside. null, hvis ingen af dem findes.
export function signupLink(center, chain, pricedOffer) {
  const url = offerSignupUrl(pricedOffer) ?? center?.signupUrl ?? chain?.website;
  if (!url) return null;

  const [withoutHash, hash] = url.split('#');
  const separator = withoutHash.includes('?') ? '&' : '?';
  const params = `utm_source=gymfinder&utm_medium=henvisning&utm_content=${encodeURIComponent(
    center?.id ?? '',
  )}`;
  return `${withoutHash}${separator}${params}${hash != null ? `#${hash}` : ''}`;
}
