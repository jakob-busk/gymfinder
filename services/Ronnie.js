import {
  RONNIE_MAX_LOOKUP_ROUNDS,
  RonnieError,
  buildRonnieRequest,
  isOpenAiKeyConfigured,
  parseRonnieReply,
  ronnieErrorFromResponse,
  runRonnieLookups,
} from '../data/ronnie';

// Kalder OpenAI (gpt-4o-mini) direkte fra appen. Nøglen ligger i .env som
// EXPO_PUBLIC_OPENAI_API_KEY og kommer aldrig i git. EXPO_PUBLIC_* ender i app-bundlen, så
// nøglen skal have en lav forbrugsgrænse hos OpenAI (se README).
const API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// Efter så lang tid uden svar gives op, og brugeren får en forbindelsesfejl.
const TIMEOUT_MS = 30000;

// false, når .env mangler nøglen. Så viser Spørg Ronnie en besked i stedet for chatten.
export const ronnieAvailable = isOpenAiKeyConfigured(OPENAI_API_KEY);

// Ét kald til OpenAI. Returnerer beskeden fra svaret (tekst eller værktøjskald).
async function callOpenAi(request, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch (error) {
    throw new RonnieError('network', error.message);
  } finally {
    clearTimeout(timeout);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) throw ronnieErrorFromResponse(response.status, data);
  return data?.choices?.[0]?.message ?? {};
}

// Sender hele samtalen og de Centre, Ronnie kender (CenterMatch fra Matchning), til OpenAI.
// Spørger brugeren om et andet sted, kalder Ronnie værktøjet "find centre nær stednavn"; så slås
// stedet op med lookupInput ({ geocode, centers, chains, user, filters, today }), og svaret
// sendes tilbage til Ronnie, der derefter svarer. Uden lookupInput kan Ronnie ikke slå op.
// Returnerer { role: 'assistant', content, centerIds, lookup? }. Kaster en RonnieError ved fejl.
export async function askRonnie({
  conversation,
  matches,
  user,
  lookupInput,
  apiKey = OPENAI_API_KEY,
}) {
  if (!isOpenAiKeyConfigured(apiKey)) throw new RonnieError('missingKey');

  const pendingToolMessages = [];
  const pendingLookupMatches = [];
  for (let round = 0; ; round += 1) {
    const allowLookup = Boolean(lookupInput) && round < RONNIE_MAX_LOOKUP_ROUNDS;
    const message = await callOpenAi(
      buildRonnieRequest({
        conversation,
        matches,
        user,
        pendingToolMessages,
        pendingLookupMatches,
        allowLookup,
      }),
      apiKey,
    );

    if (allowLookup && message.tool_calls?.length > 0) {
      const lookup = await runRonnieLookups(message, lookupInput);
      pendingToolMessages.push(...lookup.toolMessages);
      pendingLookupMatches.push(...lookup.matches);
      continue;
    }

    const reply = parseRonnieReply(message.content, matches, {
      conversation,
      lookupMatches: pendingLookupMatches,
    });
    if (pendingToolMessages.length === 0) return reply;
    return {
      ...reply,
      lookup: { toolMessages: pendingToolMessages, matches: pendingLookupMatches },
    };
  }
}
