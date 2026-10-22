// Brugerens profil: adresse og placering, fødselsdato, Rabatprofil, Nuværende medlemskab og
// Præferencer. Ren JavaScript uden React Native, Expo eller Firebase, så den kan testes direkte.
//
// Profilen har samme form som brugeren i Matchning (data/matchning.js):
//
//   { address, location: { latitude, longitude } | null, birthDate: 'YYYY-MM-DD' | null,
//     discountProfile: ['student', ...], currentMembership: { monthlyPrice, chainId } | null,
//     preferences: { machines, sauna, groupClasses, open24h, multiCenterAccess, noBinding,
//                    maxDistanceKm },
//     onboardingCompletedAt: ISO-tidspunkt | null }
//
// I Realtime Database ligger den under Users/<uid>/profile. Databasen gemmer hverken null eller
// tomme lister, så fromStoredProfile sætter de manglende felter tilbage til standardværdierne.

import { DISCOUNT_GROUPS } from './matchning.js';

// Præferencer er udgangspunktet for Filtre på Find. Uden Præferencer er kun maks. afstand sat.
export const EMPTY_PREFERENCES = {
  machines: [],
  sauna: false,
  groupClasses: false,
  open24h: false,
  multiCenterAccess: false,
  noBinding: false,
  maxDistanceKm: 15,
};

export const MAX_DISTANCE_OPTIONS = [5, 15, 50];

export const EMPTY_PROFILE = {
  address: '',
  location: null,
  birthDate: null,
  discountProfile: [],
  currentMembership: null,
  preferences: EMPTY_PREFERENCES,
  onboardingCompletedAt: null,
};

// Hvem hører til hver Rabatgruppe, forklaret til brugeren.
export const DISCOUNT_GROUP_DESCRIPTIONS = {
  student: 'Du har et gyldigt studiekort.',
  senior: 'Du får folkepension eller førtidspension.',
  aeldreSagen: 'Du er medlem af Ældre Sagen.',
  partner: 'Du vil melde dig ind sammen med en anden og se Makkerpris pr. person.',
};

const MAX_AGE = 120;

const pad = (value) => String(value).padStart(2, '0');

// Accepterer dansk format (12-03-1997, 12.3.1997, 12/03/1997) og ISO (1997-03-12).
// Returnerer { birthDate: 'YYYY-MM-DD' } eller { error } med en dansk fejltekst.
export function parseBirthDate(text, today = new Date()) {
  const value = String(text ?? '').trim();
  if (!value) return { error: 'Udfyld din fødselsdato.' };

  let day;
  let month;
  let year;
  const danish = value.match(/^(\d{1,2})[-./ ](\d{1,2})[-./ ](\d{4})$/);
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (danish) [, day, month, year] = danish.map(Number);
  else if (iso) [, year, month, day] = iso.map(Number);
  else return { error: 'Skriv fødselsdatoen som DD-MM-ÅÅÅÅ, fx 12-03-1997.' };

  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate) return { error: 'Den dato findes ikke.' };

  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (date.getTime() > todayUtc) return { error: 'Fødselsdatoen kan ikke ligge i fremtiden.' };
  if (today.getFullYear() - year > MAX_AGE) return { error: 'Tjek årstallet.' };

  return { birthDate: `${year}-${pad(month)}-${pad(day)}` };
}

// 'YYYY-MM-DD' → 'DD-MM-ÅÅÅÅ' til visning og redigering.
export function formatBirthDate(birthDate) {
  if (!birthDate) return '';
  const [year, month, day] = birthDate.split('-');
  return `${day}-${month}-${year}`;
}

// Brugerens egen månedspris for Nuværende medlemskab, fx "299" eller "249,50".
// Returnerer et positivt tal eller null, hvis teksten ikke er en gyldig pris.
export function parseMonthlyPrice(text) {
  const value = String(text ?? '').trim().replace(/\s*kr\.?$/i, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const price = Number(value);
  return price > 0 && price < 10000 ? price : null;
}

// Adresse fra en omvendt geokodning (expo-location reverseGeocodeAsync) som én linje,
// fx "Østerbrogade 79, 2100 København Ø".
export function formatPlaceAddress(place) {
  if (!place) return '';
  const street = [place.street, place.streetNumber].filter(Boolean).join(' ');
  const town = [place.postalCode, place.city].filter(Boolean).join(' ');
  return [street || place.name, town].filter(Boolean).join(', ');
}

const isLocation = (value) =>
  value != null && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);

// Rækkefølgen af Rabatgrupper følger DISCOUNT_GROUPS, og ukendte grupper fjernes.
function normalizeDiscountProfile(value) {
  const groups = Array.isArray(value) ? value : Object.values(value ?? {});
  return Object.keys(DISCOUNT_GROUPS).filter((group) => groups.includes(group));
}

function normalizeCurrentMembership(value) {
  if (!value || !(value.monthlyPrice > 0)) return null;
  return { monthlyPrice: value.monthlyPrice, chainId: value.chainId ?? null };
}

function normalizePreferences(value) {
  const preferences = { ...EMPTY_PREFERENCES, ...value };
  const machines = preferences.machines;
  return {
    ...preferences,
    machines: Array.isArray(machines) ? machines : Object.values(machines ?? {}),
  };
}

// Data fra databasen eller AsyncStorage → komplet profil. null, hvis der ikke er gemt noget.
export function fromStoredProfile(stored) {
  if (!stored || typeof stored !== 'object') return null;
  return {
    address: stored.address ?? '',
    location: isLocation(stored.location) ? stored.location : null,
    birthDate: stored.birthDate ?? null,
    discountProfile: normalizeDiscountProfile(stored.discountProfile),
    currentMembership: normalizeCurrentMembership(stored.currentMembership),
    preferences: normalizePreferences(stored.preferences),
    onboardingCompletedAt: stored.onboardingCompletedAt ?? null,
  };
}

// Profil → det, der gemmes. Kun profilens egne felter kommer med.
export function toStoredProfile(profile) {
  return fromStoredProfile(profile) ?? EMPTY_PROFILE;
}

// Adresse (med placering) og fødselsdato er krævet. Resten kan springes over.
export function hasRequiredFields(profile) {
  return Boolean(profile?.address?.trim() && isLocation(profile.location) && profile.birthDate);
}

// Onboarding vises, indtil den er gennemført én gang, enten på denne telefon (cachen i
// AsyncStorage) eller på profilen (fx efter login på en ny telefon). Mangler de krævede
// oplysninger alligevel, vises den igen.
export function needsOnboarding({ cachedDone, profile }) {
  const done = cachedDone || Boolean(profile?.onboardingCompletedAt);
  return !done || !hasRequiredFields(profile);
}
