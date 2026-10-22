import {
  RONNIE_CENTER_LIMIT,
  RONNIE_MODEL,
  RonnieError,
  buildRonnieRequest,
  centerQuestion,
  isOpenAiKeyConfigured,
  parseRonnieReply,
  ronnieErrorFromResponse,
  ronnieErrorMessage,
  ronnieMatches,
} from './ronnie';

// Adfærdstests for Spørg Ronnie uden netværk: hvilke Centre Ronnie kender, hvad der sendes til
// OpenAI, og hvordan svaret læses. Alle tal er regnet ud på forhånd.

const TODAY = '2026-10-22';
const HOME = { latitude: 55.6761, longitude: 12.5683 };

const CHAIN = {
  id: 'kaede',
  name: 'Kæde',
  website: 'https://kaede.dk',
  discounts: [{ discountGroup: 'student', percentOff: 50 }],
};

function offer(overrides = {}) {
  return {
    id: 'basis',
    name: 'Basis',
    subscriptionType: 'Lokal center',
    standardPrice: 300,
    campaignPrice: null,
    campaignMonths: 0,
    signupFee: 120,
    adminFee: 10,
    bindingMonths: 0,
    partnerPrice: null,
    ...overrides,
  };
}

// Center nr. n ligger n * 0,01 breddegrader (ca. 1,1 km) nord for brugeren.
function center(n, overrides = {}) {
  return {
    id: `kaede-${n}`,
    chainId: 'kaede',
    name: `Kæde ${n}`,
    address: `Gaden ${n}, 1000 København`,
    location: { latitude: HOME.latitude + n * 0.01, longitude: HOME.longitude },
    facilities: { sauna: true, groupClasses: false, open24h: null },
    machines: null,
    offers: [offer({ id: `kaede-${n}-basis` })],
    ...overrides,
  };
}

const USER = {
  birthDate: '1990-01-01',
  discountProfile: ['student'],
  currentMembership: { monthlyPrice: 299, chainId: null },
  address: 'Rådhuspladsen 1, 1550 København V',
  location: HOME,
};

function matchesFor(centers, extra = {}) {
  return ronnieMatches({ centers, chains: [CHAIN], user: USER, filters: {}, today: TODAY, ...extra });
}

describe('Centre Ronnie kender', () => {
  test('de 20 nærmeste Centre, nærmeste først', () => {
    const centers = Array.from({ length: 25 }, (_, i) => center(25 - i));
    const ids = matchesFor(centers).map((match) => match.center.id);

    expect(RONNIE_CENTER_LIMIT).toBe(20);
    expect(ids).toHaveLength(20);
    expect(ids[0]).toBe('kaede-1');
    expect(ids[19]).toBe('kaede-20');
  });

  test('Centre, der med sikkerhed ikke opfylder Filtrene, er ikke med', () => {
    const centers = [center(1), center(2, { facilities: { sauna: false } })];
    const ids = matchesFor(centers, { filters: { sauna: true } }).map((m) => m.center.id);

    expect(ids).toEqual(['kaede-1']);
  });

  test('Centret fra "Spørg Ronnie om dette center" er med, selvom Filtrene skjuler det', () => {
    const centers = [center(1), center(2, { facilities: { sauna: false } })];
    const ids = matchesFor(centers, {
      filters: { sauna: true },
      includeCenterIds: ['kaede-2'],
    }).map((m) => m.center.id);

    expect(ids).toEqual(['kaede-2', 'kaede-1']);
  });

  test('Centret fra Centerdetalje er med, selvom det ligger længere væk end de 20 nærmeste', () => {
    const centers = Array.from({ length: 22 }, (_, i) => center(i + 1));
    const ids = matchesFor(centers, { includeCenterIds: ['kaede-22'] }).map((m) => m.center.id);

    expect(ids).toHaveLength(21);
    expect(ids[0]).toBe('kaede-22');
  });
});

describe('Forespørgsel til OpenAI', () => {
  const matches = matchesFor([center(1), center(2)]);
  const conversation = [
    { role: 'user', content: 'Hvad er billigst?' },
    { role: 'assistant', content: 'Kæde 1 er billigst.', centerIds: ['kaede-1'] },
    { role: 'user', content: 'Har det sauna?' },
  ];
  const request = buildRonnieRequest({ conversation, matches, user: USER });
  const systemPrompt = request.messages[0].content;
  const centersInPrompt = JSON.parse(systemPrompt.split('\n').at(-1));

  test('bruger gpt-4o-mini med system-prompt først', () => {
    expect(request.model).toBe(RONNIE_MODEL);
    expect(RONNIE_MODEL).toBe('gpt-4o-mini');
    expect(request.messages[0].role).toBe('system');
  });

  test('Ronnie kan slå Centre op andre steder i landet med et værktøj', () => {
    expect(request.tools.map((tool) => tool.function.name)).toEqual(['find_centre_naer_sted']);
    expect(request.tool_choice).toBe('auto');
    expect(systemPrompt).toContain('find_centre_naer_sted');
  });

  test('system-prompten har kun GymFinders Centre med personlig Ærlig årspris og gebyrer', () => {
    expect(centersInPrompt.map((c) => c.id)).toEqual(['kaede-1', 'kaede-2']);
    // Studierabat 50 %: (120 + 12 × (150 + 10)) / 12 = 170 kr/md.
    expect(centersInPrompt[0]).toMatchObject({
      navn: 'Kæde 1',
      kaede: 'Kæde',
      afstandKm: 1.1,
      faciliteter: { Sauna: 'Ja', Holdtræning: 'Nej', Døgnåbent: 'Ikke oplyst' },
      tilbud: [
        {
          navn: 'Basis',
          aerligAarsprisKrPrMd: 170,
          billigsteMulighed: 'Studierabat',
          oprettelsesgebyrKr: 120,
          admingebyrKr: 10,
          binding: 'Ingen',
        },
      ],
    });
    expect(systemPrompt).toContain('Anbefal KUN Centre fra listen');
    expect(systemPrompt).toContain('Ærlig årspris');
    expect(systemPrompt).toContain('Studerende');
    expect(systemPrompt).toContain('299 kr/md');
  });

  test('hele samtalen sendes med i rækkefølge, Ronnies svar i samme JSON-form', () => {
    expect(request.messages.slice(1)).toEqual([
      { role: 'user', content: 'Hvad er billigst?' },
      {
        role: 'assistant',
        content: JSON.stringify({ tekst: 'Kæde 1 er billigst.', centerIds: ['kaede-1'] }),
      },
      { role: 'user', content: 'Har det sauna?' },
    ]);
  });

  test('svarformatet tillader kun id\'er på de Centre, Ronnie kender', () => {
    const { schema } = request.response_format.json_schema;
    expect(request.response_format.type).toBe('json_schema');
    expect(schema.required).toEqual(['tekst', 'centerIds']);
    expect(schema.properties.centerIds.items.enum).toEqual(['kaede-1', 'kaede-2']);
  });

  test('uden Centre er svarformatet stadig gyldigt', () => {
    const empty = buildRonnieRequest({ conversation, matches: [], user: USER });
    expect(empty.response_format.json_schema.schema.properties.centerIds.items).toEqual({
      type: 'string',
    });
  });
});

describe('Ronnies svar', () => {
  const matches = matchesFor([center(1), center(2)]);

  test('tekst og centerIds læses fra JSON', () => {
    const reply = parseRonnieReply(
      JSON.stringify({ tekst: 'Prøv Kæde 2.', centerIds: ['kaede-2'] }),
      matches,
    );
    expect(reply).toEqual({ role: 'assistant', content: 'Prøv Kæde 2.', centerIds: ['kaede-2'] });
  });

  test('ukendte og gentagne id\'er giver ingen ekstra knapper', () => {
    const reply = parseRonnieReply(
      JSON.stringify({ tekst: 'Svar', centerIds: ['kaede-1', 'andet-center', 'kaede-1'] }),
      matches,
    );
    expect(reply.centerIds).toEqual(['kaede-1']);
  });

  test('svar, der ikke er JSON, vises som tekst uden knapper', () => {
    expect(parseRonnieReply('  Hej med dig  ', matches)).toEqual({
      role: 'assistant',
      content: 'Hej med dig',
      centerIds: [],
    });
  });

  test('tomt svar er en fejl', () => {
    expect(() => parseRonnieReply('', matches)).toThrow(RonnieError);
    expect(() => parseRonnieReply(undefined, matches)).toThrow(RonnieError);
  });
});

describe('Fejl og nøgle', () => {
  test('HTTP-status bliver til venlige danske fejltekster', () => {
    expect(ronnieErrorMessage(ronnieErrorFromResponse(401))).toMatch(/Nøglen er ugyldig/);
    expect(ronnieErrorMessage(ronnieErrorFromResponse(429))).toMatch(/for mange spørgsmål/);
    expect(ronnieErrorMessage(ronnieErrorFromResponse(500))).toMatch(/kunne ikke svare/);
    expect(ronnieErrorMessage(new RonnieError('missingKey'))).toMatch(/ikke sat op/);
  });

  test('ukendte fejl (fx ingen forbindelse) regnes som forbindelsesfejl', () => {
    expect(ronnieErrorMessage(new TypeError('Network request failed'))).toMatch(
      /internetforbindelse/,
    );
  });

  test('pladsholderen fra .env.example tæller ikke som en nøgle', () => {
    expect(isOpenAiKeyConfigured('sk-proj-abc123')).toBe(true);
    expect(isOpenAiKeyConfigured('<openai-noegle>')).toBe(false);
    expect(isOpenAiKeyConfigured('  ')).toBe(false);
    expect(isOpenAiKeyConfigured(undefined)).toBe(false);
  });
});

test('"Spørg Ronnie om dette center" giver et færdigt spørgsmål med Centrets navn', () => {
  expect(centerQuestion('Kæde 1')).toMatch(/^Er Kæde 1 et godt valg for mig\?/);
});
