// Ronnies system-prompt og svarformat. Ren JavaScript uden React Native eller Expo, så prompten
// kan testes uden netværk. Alle priser kommer fra Matchning (data/matchning.js); Ronnie regner
// ikke selv, han får brugerens personlige Ærlig årspris for hvert Tilbud serveret.

import { DISCOUNT_GROUPS } from './matchning.js';
import { facilityRows } from './centerDetail.js';

const round = (amount) => Math.round(amount);

function bindingText(bindingMonths) {
  if (bindingMonths == null) return 'Ikke oplyst';
  return bindingMonths === 0 ? 'Ingen' : `${bindingMonths} mdr.`;
}

// Ét Center som kompakt data til prompten: faciliteter som Ja/Nej/Ikke oplyst og hvert Tilbud
// med brugerens Ærlig årspris, den billigste mulighed for brugeren, gebyrer og Binding.
function centerFacts(match) {
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
      abonnementstype: priced.offer.subscriptionType ?? null,
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
    `Brugerens Rabatprofil: ${groups.length > 0 ? groups.join(', ') : 'ingen Rabatgrupper'}.`,
    membership?.monthlyPrice != null
      ? `Brugerens Nuværende medlemskab koster ${membership.monthlyPrice} kr/md.`
      : 'Brugeren har intet Nuværende medlemskab.',
    user?.address
      ? `Afstande er i luftlinje fra brugerens adresse (${user.address}).`
      : 'Brugerens placering kendes ikke, så afstande mangler.',
  ];
}

// System-prompten til Ronnie. matches er CenterMatch fra Matchning (de Centre Ronnie må anbefale).
export function buildRonnieSystemPrompt({ matches, user }) {
  return [
    'Du er Ronnie, GymFinders maskot og rådgiver. Du hjælper brugeren med at finde det Center og',
    'det Tilbud, der passer bedst, og du svarer kort, venligt og konkret på dansk (højst ca. 120 ord).',
    '',
    'Regler:',
    '- Anbefal KUN Centre fra listen nedenfor. Nævn aldrig andre fitnesscentre eller kæder.',
    '- Sammenlign altid på "aerligAarsprisKrPrMd" (Ærlig årspris): det, brugeren reelt betaler',
    '  i gennemsnit pr. måned over et år inkl. Oprettelsesgebyr, Admingebyr, Kampagnepris og Rabat.',
    '  Det er allerede regnet ud for netop denne bruger. Regn ikke selv priser ud.',
    '- Nævn gebyrer og Binding, når de betyder noget, og hvilken mulighed der er billigst',
    '  ("billigsteMulighed", fx Kampagnepris eller Studierabat).',
    '- "Ikke oplyst" betyder, at det er ukendt. Sig det ærligt i stedet for at gætte.',
    '- Kan ønsket ikke opfyldes blandt Centrene, så sig det og foreslå det nærmeste alternativ.',
    '- Spørger brugeren om et sted, der ikke er med i listen, så sig, at du kun kender Centrene',
    '  her, og at brugeren kan ændre sin adresse på Profil.',
    '',
    'Svarformat: JSON med "tekst" (dit svar til brugeren) og "centerIds" (id på hvert Center,',
    'du nævner eller anbefaler i teksten, i samme rækkefølge). Brug kun id\'er fra listen.',
    'Skriv Centrenes navne i teksten præcis som i "navn".',
    '',
    ...userFacts(user),
    '',
    'Centre (de nærmeste, der matcher brugerens Filtre):',
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
