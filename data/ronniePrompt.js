// Ronnies system-prompt og svarformat. Ren JavaScript uden React Native eller Expo, så prompten
// kan testes uden netværk. Alle priser kommer fra Matchning (data/matchning.js); Ronnie regner
// ikke selv, han får brugerens personlige Ærlig årspris for hvert Tilbud serveret.

import { DISCOUNT_GROUPS } from './matchning.js';
import { facilityRows, subscriptionTypeLabel } from './centerDetail.js';

// Navnet på Ronnies værktøj til opslag af Centre andre steder (se data/ronnieLookup.js).
export const RONNIE_LOOKUP_TOOL_NAME = 'find_centre_naer_sted';

const round = (amount) => Math.round(amount);

function bindingText(bindingMonths) {
  if (bindingMonths == null) return 'Ikke oplyst';
  return bindingMonths === 0 ? 'Ingen' : `${bindingMonths} mdr.`;
}

// Ét Center som kompakt data til prompten (og til svar fra opslag af andre steder): faciliteter
// som Ja/Nej/Ikke oplyst og hvert Tilbud med brugerens Ærlig årspris, den billigste mulighed for
// brugeren, gebyrer og Binding. Abonnementstypen står med appens ord (lokalt center /
// landsdækkende), så Ronnie skriver det samme som resten af appen.
export function centerFacts(match) {
  const { center, chain, distanceKm, offers } = match;
  return {
    id: center.id,
    navn: center.name,
    kaede: chain?.name ?? null,
    adresse: center.address ?? null,
    afstandKm: distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
    faciliteter: Object.fromEntries(facilityRows(center).map((row) => [row.label, row.value])),
    tilbud: offers.map((priced) => ({
      navn: priced.offer.name,
      abonnementstype: subscriptionTypeLabel(priced.offer.subscriptionType),
      aerligAarsprisKrPrMd: round(priced.honestYearlyPrice),
      kvartalsprisKrPrMd: round(priced.quarterlyPrice),
      billigsteMulighed: priced.yearlyOption.label,
      oprettelsesgebyrKr: round(priced.signupFee),
      admingebyrKr: round(priced.adminFee),
      binding: bindingText(priced.bindingMonths),
    })),
  };
}

function userFacts(user) {
  const groups = (user?.discountProfile ?? []).map((group) => DISCOUNT_GROUPS[group]?.label ?? group);
  const membership = user?.currentMembership;
  return [
    `Brugerens rabatgrupper: ${groups.length > 0 ? groups.join(', ') : 'ingen'}.`,
    membership?.monthlyPrice != null
      ? `Brugerens nuværende medlemskab koster ${membership.monthlyPrice} kr. pr. md.`
      : 'Brugeren har intet nuværende medlemskab.',
    user?.address
      ? `Afstande er i luftlinje fra brugerens adresse (${user.address}).`
      : 'Brugerens placering kendes ikke, så afstande mangler.',
  ];
}

// System-prompten til Ronnie. matches er CenterMatch fra Matchning (de Centre Ronnie må anbefale).
// Prompten skriver selv med appens ord (se "Sproget i appen" i CODING_STANDARDS.md), og reglen om
// sprog beder Ronnie gøre det samme. Han sammenligner fortsat kun på Ærlig årspris.
export function buildRonnieSystemPrompt({ matches, user }) {
  return [
    'Du er Ronnie, GymFinders maskot og rådgiver. Du hjælper brugeren med at finde det center og',
    'det abonnement, der passer bedst, og du svarer kort, venligt og konkret på dansk (højst ca. 120 ord).',
    '',
    'Regler:',
    '- Anbefal kun centre fra listen nedenfor. Nævn aldrig andre fitnesscentre eller kæder.',
    '- Sammenlign altid på "aerligAarsprisKrPrMd" (ærlig årspris): det, brugeren reelt betaler',
    '  i gennemsnit pr. måned over et år inkl. oprettelse, admingebyr, kampagnepris og rabat.',
    '  Det er allerede regnet ud for netop denne bruger. Regn ikke selv priser ud.',
    '- Nævn gebyrer og binding, når de betyder noget, og hvilken mulighed der er billigst',
    '  ("billigsteMulighed", fx kampagnepris eller studierabat).',
    '- "Ikke oplyst" betyder, at det er ukendt. Sig det ærligt i stedet for at gætte.',
    '- Kan ønsket ikke opfyldes blandt centrene, så sig det og foreslå det nærmeste alternativ.',
    '- Spørger brugeren om centre et andet sted i landet (fx ved et sommerhus, arbejdet eller en',
    `  by), så kald værktøjet "${RONNIE_LOOKUP_TOOL_NAME}" med stednavnet, og svar ud fra de centre,`,
    '  det giver. Sig, hvilket sted afstandene er fra. Står der i opslagets "besked", at stedet',
    '  ikke kunne findes, ligger uden for Danmark, eller at der ingen centre er, så sig det venligt',
    '  og bed evt. om et mere præcist stednavn (by eller postnummer). Gæt aldrig på centre.',
    '',
    'Sprog: Skriv almindeligt dansk med de samme ord som resten af GymFinder.',
    '- Stort bogstav kun først i en sætning. Midt i en sætning skrives fx "center", "kæde",',
    '  "abonnement", "ærlig årspris", "binding" og "ikke oplyst" med småt.',
    '- Sig "abonnement" (ikke tilbud), "normalpris" (ikke standardpris), "oprettelse" (ikke',
    '  oprettelsesgebyr), "de første 3 måneder" om "kvartalsprisKrPrMd", "lokalt center" eller',
    '  "landsdækkende" om abonnementstypen, "dine ønsker" om brugerens krav, og "makkerpris",',
    '  "studierabat", "seniorrabat" eller "Ældre Sagen-rabat" om rabatter.',
    '- Skriv tal på dansk, fx 3,4 km, 1.234 kr. og 249 kr. pr. md.',
    '',
    'Svarformat: JSON med "tekst" (dit svar til brugeren) og "centerIds" (id på hvert center,',
    'du nævner eller anbefaler i teksten, i samme rækkefølge). Brug kun id\'er fra listen eller',
    'fra dine opslag.',
    'Skriv centrenes navne i teksten præcis som i "navn".',
    '',
    ...userFacts(user),
    '',
    'Centre (de nærmeste, der passer til brugerens ønsker):',
    JSON.stringify(matches.map(centerFacts)),
  ].join('\n');
}

// Struktureret svar { tekst, centerIds } (OpenAI Structured Outputs). centerIds må kun være id'er
// fra prompten, så "Se [center] →"-knapperne altid passer.
export function ronnieResponseFormat(centerIds) {
  const idSchema = centerIds.length > 0 ? { type: 'string', enum: centerIds } : { type: 'string' };
  return {
    type: 'json_schema',
    json_schema: {
      name: 'ronnie_svar',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          tekst: { type: 'string' },
          centerIds: { type: 'array', items: idSchema },
        },
        required: ['tekst', 'centerIds'],
        additionalProperties: false,
      },
    },
  };
}
