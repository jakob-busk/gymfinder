export const MACHINES = ['Bænkpres', 'Løbebånd', 'Squat rack', 'Romaskine'];

export const SUBSCRIPTION_TYPES = ['Lokal center', 'Landsdækkende'];

export const SORT_OPTIONS = ['Pris', 'Distance', 'Præferencer'];

// Mock-data: opdigtede priser og afstande til brug for prototypen.
// I en rigtig version af GymFinder ville disse tal blive hentet fra centrenes egne tilbud.
// Hvert center har typisk to Tilbud, ét pr. Abonnementstype - landsdækkende koster mere
// end lokal adgang, men giver adgang til alle centerets lokationer.
export const GYMS = [
  {
    id: 'puregym-lokal',
    name: 'PureGym',
    website: 'https://www.puregym.dk',
    distanceKm: 1.2,
    subscriptionType: 'Lokal center',
    machines: ['Bænkpres', 'Løbebånd'],
    sauna: false,
    standardPrice: 299,
    campaignPrice: null,
    campaignMonths: 0,
    studentPrice: 179,
    studentMonths: 12,
    signupFee: 0,
  },
  {
    id: 'puregym-landsdaekkende',
    name: 'PureGym',
    website: 'https://www.puregym.dk',
    distanceKm: 1.2,
    subscriptionType: 'Landsdækkende',
    machines: ['Bænkpres', 'Løbebånd'],
    sauna: false,
    standardPrice: 399,
    campaignPrice: null,
    campaignMonths: 0,
    studentPrice: 239,
    studentMonths: 12,
    signupFee: 0,
  },
  {
    id: 'fitnessx-lokal',
    name: 'Fitness X',
    website: 'https://www.fitnessx.dk',
    distanceKm: 3.8,
    subscriptionType: 'Lokal center',
    machines: ['Bænkpres', 'Squat rack', 'Løbebånd'],
    sauna: true,
    standardPrice: 249,
    campaignPrice: 129,
    campaignMonths: 3,
    studentPrice: null,
    studentMonths: null,
    signupFee: 99,
  },
  {
    id: 'fitnessx-landsdaekkende',
    name: 'Fitness X',
    website: 'https://www.fitnessx.dk',
    distanceKm: 3.8,
    subscriptionType: 'Landsdækkende',
    machines: ['Bænkpres', 'Squat rack', 'Løbebånd'],
    sauna: true,
    standardPrice: 229,
    campaignPrice: 99,
    campaignMonths: 3,
    studentPrice: null,
    studentMonths: null,
    signupFee: 199,
  },
  {
    id: 'sats-lokal',
    name: 'SATS',
    website: 'https://www.sats.dk',
    distanceKm: 0.9,
    subscriptionType: 'Lokal center',
    machines: ['Bænkpres', 'Løbebånd', 'Romaskine'],
    sauna: true,
    standardPrice: 399,
    campaignPrice: 249,
    campaignMonths: 2,
    studentPrice: 299,
    studentMonths: null,
    signupFee: 0,
  },
  {
    id: 'sats-landsdaekkende',
    name: 'SATS',
    website: 'https://www.sats.dk',
    distanceKm: 0.9,
    subscriptionType: 'Landsdækkende',
    machines: ['Bænkpres', 'Løbebånd', 'Romaskine'],
    sauna: true,
    standardPrice: 499,
    campaignPrice: 329,
    campaignMonths: 2,
    studentPrice: 379,
    studentMonths: null,
    signupFee: 0,
  },
];

export const DEFAULT_USER = {
  name: 'Jakob Busk',
  address: 'Teglværksgade 16, 1. th, København Ø',
  isStudent: true,
  username: 'jakobbusk',
  email: 'jakobbusken@gmail.com',
  preferences: {
    machines: ['Bænkpres', 'Løbebånd'],
    sauna: null, // null = ingen præference, ellers true/false
    subscriptionType: 'Lokal center',
  },
};
