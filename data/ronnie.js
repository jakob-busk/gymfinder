// Spørg Ronnie: ren logik bag chatten (hvilke Centre Ronnie kender, hvad der sendes til OpenAI,
// hvordan svaret læses, og hvilke fejltekster brugeren ser). Ren JavaScript uden React Native
// eller Expo, så det kan testes uden netværk. Selve kaldet ligger i services/Ronnie.js.
//
// En besked i samtalen: { role: 'user' | 'assistant', content, centerIds? }
//   centerIds = de Centre, Ronnie nævner i et svar ("Se [center] →"-knapperne).

import { matchCenters } from './matchning.js';
import { buildRonnieSystemPrompt, ronnieResponseFormat } from './ronniePrompt.js';

export const RONNIE_MODEL = 'gpt-4o-mini';

// Så mange af de nærmeste Centre, der matcher, kommer med i prompten.
export const RONNIE_CENTER_LIMIT = 20;

// Færdige forslag, der vises før første besked.
export const RONNIE_SUGGESTIONS = [
  'Hvad er det billigste Center for mig?',
  'Jeg vil have sauna og ingen binding. Hvad passer til mig?',
  'Hvor tæt på mig kan jeg træne billigst med holdtræning?',
];

// Det færdige spørgsmål, når man trykker "Spørg Ronnie om dette center" på Centerdetalje.
export function centerQuestion(centerName) {
  return `Er ${centerName} et godt valg for mig? Hvordan er Ærlig årspris i forhold til Centrene tæt på mig?`;
}

// De Centre, Ronnie kender i samtalen: de RONNIE_CENTER_LIMIT nærmeste, der matcher brugerens
// Filtre, med personlig Ærlig årspris fra Matchning. Centre i includeCenterIds (fx det Center,
// brugeren spørger om fra Centerdetalje) kommer altid med, også hvis Filtrene ellers skjuler dem.
export function ronnieMatches({ centers, chains, user, filters, today, includeCenterIds = [] }) {
  const location = user?.location ?? null;
  const nearest = matchCenters({
    centers,
    chains,
    user,
    filters,
    sortBy: 'distance',
    location,
    today,
  }).centers.slice(0, RONNIE_CENTER_LIMIT);

  const known = new Set(nearest.map((match) => match.center.id));
  const extraCenters = (centers ?? []).filter(
    (center) => includeCenterIds.includes(center.id) && !known.has(center.id),
  );
  if (extraCenters.length === 0) return nearest;

  const extra = matchCenters({ centers: extraCenters, chains, user, filters: {}, location, today });
  return [...extra.centers, ...nearest];
}

// Assistent-beskeder sendes tilbage i samme JSON-form, som Ronnie svarer i, så han holder formatet
// i opfølgende svar. Hele samtalen sendes med hver gang, så Ronnie husker den.
function toApiMessage(message) {
  if (message.role !== 'assistant') return { role: 'user', content: message.content };
  return {
    role: 'assistant',
    content: JSON.stringify({ tekst: message.content, centerIds: message.centerIds ?? [] }),
  };
}

// Body til OpenAI's Chat Completions: system-prompt med Centrene og hele samtalen.
export function buildRonnieRequest({ conversation, matches, user }) {
  return {
    model: RONNIE_MODEL,
    temperature: 0.4,
    response_format: ronnieResponseFormat(matches.map((match) => match.center.id)),
    messages: [
      { role: 'system', content: buildRonnieSystemPrompt({ matches, user }) },
      ...conversation.map(toApiMessage),
    ],
  };
}

// Læser Ronnies svar ({ tekst, centerIds } som JSON) og returnerer en besked til samtalen.
// centerIds renses, så kun Centre, Ronnie faktisk kender, giver en "Se [center] →"-knap.
// Er svaret ikke JSON, vises teksten som den er, uden knapper.
export function parseRonnieReply(content, matches) {
  const knownIds = new Set(matches.map((match) => match.center.id));
  const raw = String(content ?? '').trim();

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  const text = typeof parsed?.tekst === 'string' ? parsed.tekst.trim() : raw;
  if (!text) throw new RonnieError('badReply');

  const ids = Array.isArray(parsed?.centerIds) ? parsed.centerIds : [];
  const centerIds = [...new Set(ids)].filter((id) => knownIds.has(id));
  return { role: 'assistant', content: text, centerIds };
}

// ---------- Fejl ----------

// Fejl med en kode, som skærmen kan oversætte til en venlig tekst (ronnieErrorMessage).
// code: 'missingKey' | 'network' | 'invalidKey' | 'rateLimit' | 'server' | 'badReply'
export class RonnieError extends Error {
  constructor(code, detail) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'RonnieError';
    this.code = code;
  }
}

// Oversætter et fejlet svar fra OpenAI (HTTP-status og evt. fejlkode i body) til en RonnieError.
export function ronnieErrorFromResponse(status, body) {
  const detail = body?.error?.message;
  if (status === 401 || status === 403) return new RonnieError('invalidKey', detail);
  if (status === 429) return new RonnieError('rateLimit', detail);
  return new RonnieError('server', detail ?? `HTTP ${status}`);
}

const ERROR_MESSAGES = {
  missingKey:
    'Ronnie er ikke sat op på denne telefon endnu. Der mangler en OpenAI-nøgle (se README).',
  network: 'Ronnie kan ikke få forbindelse lige nu. Tjek din internetforbindelse, og prøv igen.',
  invalidKey: 'Ronnie kunne ikke logge ind hos OpenAI. Nøglen er ugyldig eller udløbet.',
  rateLimit: 'Ronnie har fået for mange spørgsmål på kort tid. Vent lidt, og prøv igen.',
  server: 'Ronnie kunne ikke svare lige nu. Prøv igen om lidt.',
  badReply: 'Ronnie svarede ikke ordentligt. Prøv at stille spørgsmålet igen.',
};

// Venlig dansk fejltekst til brugeren. Ukendte fejl (fx "Network request failed") regnes som
// forbindelsesfejl, da det er den typiske årsag.
export function ronnieErrorMessage(error) {
  return ERROR_MESSAGES[error?.code] ?? ERROR_MESSAGES.network;
}

// Er OpenAI-nøglen fra .env udfyldt? Pladsholderen fra .env.example (<...>) tæller som tom.
export function isOpenAiKeyConfigured(key) {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  return trimmed !== '' && !trimmed.includes('<') && !trimmed.includes('>');
}
