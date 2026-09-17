# GymFinder

En React Native/Expo-app der sammenligner tilbud fra fitnesscentre og henviser brugeren til det abonnement, der passer bedst til deres oplysninger og præferencer, baseret på en affiliate-model med centrene.

## Language

**Fitnesscenter**:
En kæde/lokation (fx PureGym, Fitness X, SATS) der udbyder ét eller flere Tilbud.
_Avoid_: Gym, center (alene), studie

**Tilbud**:
Et konkret abonnement et Fitnesscenter udbyder, med sin egen prisstruktur (Kampagnepris/Standardpris) og Abonnementstype.
_Avoid_: Plan, medlemskab, deal

**Abonnementstype**:
Kategorien af adgang et Tilbud giver (fx "Lokal center" = adgang til én lokation). Indgår både som et felt på Tilbud og som en del af brugerens Præferencer, og bruges til at matche de to.

**Præference**:
Brugerens stillede ønsker til et Tilbud: hvilke Maskiner der skal være til rådighed, om Sauna er ønsket, og hvilken Abonnementstype der ønskes. Bruges til at matche og til at afgøre hvilket Tilbud der er Anbefalet.

**Ærlig årspris**:
Det beløb brugeren reelt betaler for et Tilbud over et år, divideret med 12: (Oprettelsesgebyr + summen af 12 måneders pris) / 12, hvor hver måneds pris er Studiepris hvis aktiv, ellers Kampagnepris hvis aktiv, ellers Standardpris. Er den kanoniske pris til sammenligning på tværs af Tilbud — modsat den rå "Pris/md" et center fremhæver, som kan skjule at prisen stiger efter kampagne-/studieperioden.
_Avoid_: Månedspris, pris (alene) — brug altid "ærlig årspris" når der sammenlignes/sorteres

**Oprettelsesgebyr**:
Et valgfrit engangsgebyr ved oprettelse af et Tilbud. Indgår i beregningen af Ærlig årspris.

**Kampagnepris / Kampagneperiode**:
En midlertidigt nedsat månedspris på et Tilbud, der gælder de første N måneder (Kampagneperioden) for alle brugere, hvorefter Standardpris gælder.

**Studiepris / Studieperiode**:
En reduceret månedspris for studerende. Kan enten være permanent (intet Studieperiode angivet, gælder resten af Ærlig årspris-vinduet) eller tidsbegrænset (fx "40% rabat i 12 måneder fordi du er studerende" → Studieperiode = 12). Har forrang over en samtidig Kampagnepris på samme Tilbud — de to lægges ikke sammen.

**Standardpris**:
Den løbende månedspris på et Tilbud når hverken Kampagne- eller Studieperiode er aktiv.

**Anbefalet**:
Det Tilbud med lavest Ærlig årspris blandt dem, der opfylder ALLE brugerens ikke-blanke Præferencer (Abonnementstype-match + Sauna hvis ønsket + samtlige valgte Maskiner). Præferencer fungerer altså som et hårdt filter, ikke kun en sorteringsfaktor — matcher intet Tilbud alle præferencer, vises en tom-tilstand frem for et lempet resultat. Uafhængig af hvilken sortering ("Sorter efter") brugeren aktuelt har valgt.

**Distance**:
Afstanden mellem brugerens adresse og et Fitnesscenter. I denne version en statisk, opdigtet værdi pr. center — ikke beregnet ud fra reel geolokation.
