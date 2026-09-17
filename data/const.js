export const MACHINES = ['Bænkpres', 'Løbebånd', 'Squat rack', 'Romaskine'];

export const SUBSCRIPTION_TYPES = ['Lokal center', 'Landsdækkende'];

export const SORT_OPTIONS = ['Pris', 'Distance', 'Præferencer'];

// Mock-data: opdigtede priser og afstande til brug for prototypen.
// I en rigtig version af GymFinder ville disse tal blive hentet fra centrenes egne tilbud.
export const GYMS = [
  {
    id: 'puregym',
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
    id: 'fitnessx',
    name: 'Fitness X',
    website: 'https://www.fitnessx.dk',
    distanceKm: 3.8,
    subscriptionType: 'Landsdækkende',
    machines: ['Bænkpres', 'Squat rack'],
    sauna: true,
    standardPrice: 229,
    campaignPrice: 99,
    campaignMonths: 3,
    studentPrice: null,
    studentMonths: null,
    signupFee: 199,
  },
  {
    id: 'sats',
    name: 'SATS',
    website: 'https://www.sats.dk',
    distanceKm: 2.1,
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
