// Ugentlig grænse for Spørg Ronnie: ren logik bag tælleren (hvilken uge det er, hvor mange
// spørgsmål der er tilbage, og teksterne brugeren ser). Ren JavaScript uden React Native eller
// Expo, så det kan testes. Tælleren gemmes af services/RonnieUsage.js.
//
// Forbrug: { week: '2026-W43', count: 12 } = antal spørgsmål stillet i ISO-ugen.
// Ét spørgsmål er én besked fra brugeren, uanset hvor mange opslagsrunder Ronnie laver.

// Så mange spørgsmål må hver bruger stille Ronnie pr. uge (mandag-søndag, dansk tid).
export const RONNIE_WEEKLY_LIMIT = 100;

// Er der så få spørgsmål tilbage eller færre, viser Spørg Ronnie, hvor mange der er tilbage.
export const RONNIE_REMAINING_NOTICE_FROM = 5;

const TIME_ZONE = 'Europe/Copenhagen';
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = [
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

// Datoen i Danmark (ikke telefonens tidszone) som UTC-midnat, så der kan regnes i hele dage.
function copenhagenDay(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

// 1 = mandag ... 7 = søndag.
const isoWeekday = (day) => day.getUTCDay() || 7;

// ISO-ugen for et tidspunkt i dansk tid, fx '2026-W43'. Ugen starter mandag kl. 00 i Danmark.
// Uge 1 er ugen med årets første torsdag, så årsskiftet kan høre til året før eller efter.
export function isoWeekKey(date = new Date()) {
  const day = copenhagenDay(date);
  const thursday = new Date(day.getTime() + (4 - isoWeekday(day)) * DAY_MS);
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / DAY_MS / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// Den mandag, hvor næste uge starter (dansk dato som UTC-midnat).
export function nextWeekStart(date = new Date()) {
  const day = copenhagenDay(date);
  return new Date(day.getTime() + (8 - isoWeekday(day)) * DAY_MS);
}

// Antal spørgsmål i weekKey. Forbrug fra en tidligere uge tæller ikke.
export function questionsThisWeek(usage, weekKey) {
  if (usage?.week !== weekKey) return 0;
  const count = Number(usage.count);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

// Lægger forbruget fra databasen og fra telefonen sammen til ét. Det højeste tal vinder, så
// tælleren ikke kan nulstilles ved at slette den ene kopi.
export function mergeUsage(first, second, weekKey) {
  return {
    week: weekKey,
    count: Math.max(questionsThisWeek(first, weekKey), questionsThisWeek(second, weekKey)),
  };
}

// Forbruget efter ét spørgsmål mere i weekKey.
export function addQuestion(usage, weekKey) {
  return { week: weekKey, count: questionsThisWeek(usage, weekKey) + 1 };
}

// Hvor mange spørgsmål der er tilbage i weekKey (aldrig under 0).
export function remainingQuestions(usage, weekKey, limit = RONNIE_WEEKLY_LIMIT) {
  return Math.max(0, limit - questionsThisWeek(usage, weekKey));
}

// Tekst under chatten, når der er RONNIE_REMAINING_NOTICE_FROM eller færre spørgsmål tilbage.
// null, når der er flere (så vises intet), eller når der er 0 (så vises ronnieWeekOffMessage).
export function remainingNotice(remaining) {
  if (remaining <= 0 || remaining > RONNIE_REMAINING_NOTICE_FROM) return null;
  return `Du har ${remaining} spørgsmål tilbage til Ronnie i denne uge.`;
}

// Venlig besked, når ugens spørgsmål er brugt: Ronnie holder fri og er tilbage på mandag.
export function ronnieWeekOffMessage(date = new Date(), limit = RONNIE_WEEKLY_LIMIT) {
  const monday = nextWeekStart(date);
  const back = `mandag den ${monday.getUTCDate()}. ${MONTHS[monday.getUTCMonth()]}`;
  return (
    `Du har stillet alle ${limit} spørgsmål, du har til Ronnie i denne uge, så han holder fri ` +
    `resten af ugen. Han er tilbage ${back}. Indtil da kan du finde det Center med den laveste ` +
    'Ærlig årspris på Find.'
  );
}
