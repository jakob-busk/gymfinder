import {
  RonnieError,
  buildRonnieRequest,
  isOpenAiKeyConfigured,
  parseRonnieReply,
  ronnieErrorFromResponse,
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

// Sender hele samtalen og de Centre, Ronnie kender (CenterMatch fra Matchning), til OpenAI.
// Returnerer { role: 'assistant', content, centerIds }. Kaster en RonnieError ved fejl.
export async function askRonnie({ conversation, matches, user, apiKey = OPENAI_API_KEY }) {
  if (!isOpenAiKeyConfigured(apiKey)) throw new RonnieError('missingKey');

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
      body: JSON.stringify(buildRonnieRequest({ conversation, matches, user })),
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

  return parseRonnieReply(data?.choices?.[0]?.message?.content, matches);
}
