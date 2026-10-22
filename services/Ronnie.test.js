import { askRonnie } from './Ronnie';

// askRonnie med en falsk fetch, så der ikke bruges netværk eller en rigtig nøgle.

const MATCHES = [
  {
    center: { id: 'kaede-1', name: 'Kæde 1', address: 'Gaden 1', facilities: {} },
    chain: { name: 'Kæde' },
    distanceKm: 1,
    offers: [],
  },
];
const USER = { discountProfile: [], currentMembership: null };
const CONVERSATION = [{ role: 'user', content: 'Hvad er billigst?' }];
const KEY = 'sk-test-123';

function fakeResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

afterEach(() => {
  globalThis.fetch = undefined;
});

test('sender samtalen med nøglen og returnerer Ronnies svar med centerIds', async () => {
  globalThis.fetch = jest.fn(async () =>
    fakeResponse(200, {
      choices: [{ message: { content: '{"tekst":"Tag Kæde 1.","centerIds":["kaede-1"]}' } }],
    }),
  );

  const reply = await askRonnie({
    conversation: CONVERSATION,
    matches: MATCHES,
    user: USER,
    apiKey: KEY,
  });

  expect(reply).toEqual({ role: 'assistant', content: 'Tag Kæde 1.', centerIds: ['kaede-1'] });
  const [url, options] = globalThis.fetch.mock.calls[0];
  expect(url).toBe('https://api.openai.com/v1/chat/completions');
  expect(options.headers.Authorization).toBe(`Bearer ${KEY}`);
  expect(JSON.parse(options.body).messages.at(-1)).toEqual(CONVERSATION[0]);
});

test('uden nøgle kaldes OpenAI ikke', async () => {
  globalThis.fetch = jest.fn();
  await expect(
    askRonnie({ conversation: CONVERSATION, matches: MATCHES, user: USER, apiKey: '' }),
  ).rejects.toMatchObject({ code: 'missingKey' });
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

test('ingen forbindelse giver en forbindelsesfejl', async () => {
  globalThis.fetch = jest.fn(async () => {
    throw new TypeError('Network request failed');
  });
  await expect(
    askRonnie({ conversation: CONVERSATION, matches: MATCHES, user: USER, apiKey: KEY }),
  ).rejects.toMatchObject({ code: 'network' });
});

test('forbrugsgrænse nået (HTTP 429) giver rateLimit', async () => {
  globalThis.fetch = jest.fn(async () =>
    fakeResponse(429, { error: { message: 'You exceeded your current quota' } }),
  );
  await expect(
    askRonnie({ conversation: CONVERSATION, matches: MATCHES, user: USER, apiKey: KEY }),
  ).rejects.toMatchObject({ code: 'rateLimit' });
});
