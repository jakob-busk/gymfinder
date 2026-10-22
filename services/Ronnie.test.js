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

describe('Opslag af Centre andre steder', () => {
  const HORNBAEK = { latitude: 56.09, longitude: 12.46 };
  const HORNBAEK_CENTER = {
    id: 'hornbaek-1',
    chainId: 'kaede',
    name: 'Kæde Hornbæk',
    address: 'Havnevej 1, 3100 Hornbæk',
    location: { latitude: 56.1, longitude: 12.46 },
    facilities: { sauna: true },
    machines: null,
    offers: [
      {
        id: 'hornbaek-1-basis',
        name: 'Basis',
        standardPrice: 250,
        campaignPrice: null,
        campaignMonths: 0,
        signupFee: 0,
        adminFee: 0,
        bindingMonths: 0,
        partnerPrice: null,
      },
    ],
  };
  const LOOKUP_INPUT = {
    geocode: async (address) => (address === 'Hornbæk, Danmark' ? HORNBAEK : null),
    centers: [HORNBAEK_CENTER],
    chains: [{ id: 'kaede', name: 'Kæde', discounts: [] }],
    user: USER,
    filters: {},
    today: '2026-10-22',
  };
  const QUESTION = [{ role: 'user', content: 'Jeg har sommerhus i Hornbæk. Hvor kan jeg træne?' }];

  function toolCallResponse(place) {
    return fakeResponse(200, {
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'find_centre_naer_sted',
                  arguments: JSON.stringify({ stednavn: place }),
                },
              },
            ],
          },
        },
      ],
    });
  }

  function answer(tekst, centerIds) {
    return fakeResponse(200, {
      choices: [{ message: { content: JSON.stringify({ tekst, centerIds }) } }],
    });
  }

  const sentBodies = () =>
    globalThis.fetch.mock.calls.map(([, options]) => JSON.parse(options.body));

  const ask = (conversation) =>
    askRonnie({
      conversation,
      matches: MATCHES,
      user: USER,
      lookupInput: LOOKUP_INPUT,
      apiKey: KEY,
    });

  test('Ronnie slår stedet op og svarer ud fra Centrene dér med "Se [center] →"', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(toolCallResponse('Hornbæk'))
      .mockResolvedValueOnce(answer('Tag Kæde Hornbæk til 250 kr/md.', ['hornbaek-1']));

    const reply = await ask(QUESTION);

    expect(reply.content).toBe('Tag Kæde Hornbæk til 250 kr/md.');
    expect(reply.centerIds).toEqual(['hornbaek-1']);
    expect(reply.lookup.matches.map((match) => match.center.id)).toEqual(['hornbaek-1']);

    const [first, second] = sentBodies();
    expect(first.tools[0].function.name).toBe('find_centre_naer_sted');
    expect(first.tool_choice).toBe('auto');
    const toolMessage = second.messages.at(-1);
    expect(toolMessage).toMatchObject({ role: 'tool', tool_call_id: 'call_1' });
    expect(JSON.parse(toolMessage.content)).toMatchObject({
      sted: 'Hornbæk',
      status: 'found',
      centre: [{ id: 'hornbaek-1', tilbud: [{ aerligAarsprisKrPrMd: 250 }] }],
    });
    // Svarformatet tillader nu også det Center, der blev fundet ved opslaget.
    expect(second.response_format.json_schema.schema.properties.centerIds.items.enum).toEqual([
      'kaede-1',
      'hornbaek-1',
    ]);
  });

  test('opfølgende spørgsmål husker opslaget og dets Centre', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(toolCallResponse('Hornbæk'))
      .mockResolvedValueOnce(answer('Tag Kæde Hornbæk.', ['hornbaek-1']))
      .mockResolvedValueOnce(answer('Ja, Kæde Hornbæk har sauna.', ['hornbaek-1']));

    const first = await ask(QUESTION);
    const second = await ask([...QUESTION, first, { role: 'user', content: 'Har det sauna?' }]);

    expect(second.centerIds).toEqual(['hornbaek-1']);
    const roles = sentBodies()[2].messages.map((message) => message.role);
    expect(roles).toEqual(['system', 'user', 'assistant', 'tool', 'assistant', 'user']);
  });

  test('ukendt stednavn: Ronnie får besked om det og svarer pænt uden knapper', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(toolCallResponse('Bjergbyhøjelund'))
      .mockResolvedValueOnce(answer('Jeg kunne ikke finde Bjergbyhøjelund.', []));

    const reply = await ask(QUESTION);

    expect(reply).toMatchObject({
      content: 'Jeg kunne ikke finde Bjergbyhøjelund.',
      centerIds: [],
    });
    const toolContent = JSON.parse(sentBodies()[1].messages.at(-1).content);
    expect(toolContent).toMatchObject({ status: 'unknownPlace', centre: [] });
  });

  test('Ronnie kan ikke blive ved med at slå op: efter 2 runder skal han svare', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(toolCallResponse('Hornbæk'))
      .mockResolvedValueOnce(toolCallResponse('Hornbæk'))
      .mockResolvedValueOnce(answer('Tag Kæde Hornbæk.', ['hornbaek-1']));

    const reply = await ask(QUESTION);

    expect(reply.centerIds).toEqual(['hornbaek-1']);
    expect(sentBodies().map((body) => body.tool_choice)).toEqual(['auto', 'auto', 'none']);
  });
});
