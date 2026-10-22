# GymFinder

En React Native/Expo-app der sammenligner tilbud fra fitnesscentre og henviser brugeren til det abonnement, der passer bedst til deres oplysninger og præferencer, baseret på en affiliate-model med centrene.

## Language

### Centre og tilbud

**Kæde**:
En fitnessvirksomhed (fx PureGym, Fitness X, SATS), der driver ét eller flere Centre og fastsætter Rabatter, som gælder på tværs af sine Centre.
_Avoid_: Gym, fitnesscenter (om kæden), brand

**Center**:
En fysisk lokation med adresse, placering og faciliteter (fx sauna, holdtræning, døgnåbent), der hører til én Kæde. Det er Centre, der vises som pins på kortet.
_Avoid_: Gym, lokation, studie, fitnesscenter (alene)

**Tilbud**:
Et konkret abonnement, der kan købes i ét bestemt Center, med sin egen prisstruktur (Kampagnepris/Standardpris) og en Abonnementstype. Samme abonnementsnavn kan koste forskelligt i to Centre fra samme Kæde.
_Avoid_: Plan, medlemskab, deal

**Abonnementstype**:
Kategorien af adgang et Tilbud giver (fx "Lokal center" = adgang til ét Center, "Landsdækkende" = adgang til alle Kædens Centre).

### Pris

**Ærlig årspris**:
Det beløb brugeren reelt betaler for et Tilbud over et år, divideret med 12: (Oprettelsesgebyr + summen af 12 måneders pris inkl. Admingebyr) / 12, hvor hver måneds pris afhænger af hvilken Rabat, Kampagnepris eller Standardpris der gælder for netop denne bruger. Er den eneste pris, der bruges til sammenligning på tværs af Tilbud.
_Avoid_: Månedspris, førsteårspris, pris (alene) — brug altid "ærlig årspris" når der sammenlignes/sorteres

**Kvartalspris**:
Det brugeren i gennemsnit betaler pr. måned i de første 3 måneder af et Tilbud: (Oprettelsesgebyr + summen af 3 måneders pris inkl. Admingebyr) / 3. Viser det kortsigtede billede, hvor Kampagnepriser fylder meget. Bruges kun til sortering og som ekstra info — Anbefalet og Prisalarmer bygger altid på Ærlig årspris.

**Oprettelsesgebyr**:
Et valgfrit engangsgebyr ved oprettelse af et Tilbud. Indgår i beregningen af Ærlig årspris.

**Admingebyr**:
Et valgfrit fast gebyr pr. måned oven i månedsprisen. Indgår i beregningen af Ærlig årspris.

**Binding**:
Det antal måneder brugeren mindst skal blive i et Tilbud. Påvirker ikke Ærlig årspris, men kan bruges som Filter.

**Kampagnepris / Kampagneperiode**:
En midlertidigt nedsat månedspris på et Tilbud, der gælder de første N måneder (Kampagneperioden) for alle brugere, hvorefter Standardpris gælder. Kan være forskellig pr. Aldersgruppe (fx 25 % af hver sin Standardpris).

**Standardpris**:
Den løbende månedspris på et Tilbud når hverken Kampagne- eller Rabatperiode er aktiv. Kan være forskellig pr. Aldersgruppe.

**Aldersgruppe**:
Under 30 eller 30+. Nogle Kæder har forskellig Standardpris for de to grupper. Er ikke en Rabat — den afgør grundprisen, og en Rabat kan stadig gælde oven i. Fylder brugeren 30 inden for 12 måneder, regnes Ærlig årspris med den højere pris fra den måned.
_Avoid_: Ungdomsrabat, U30-rabat

**Rabatgruppe**:
En gruppe brugere, der har ret til særpriser hos en eller flere Kæder: Studerende, Senior/pensionist, Ældre Sagen-medlem og Træn med en makker.
_Avoid_: Rabatprofil (om selve gruppen), målgruppe

**Rabatprofil**:
De Rabatgrupper en bruger tilhører. Afgør hvilke Rabatter der gælder i brugerens Ærlig årspris.

**Rabat**:
En reduceret månedspris for én Rabatgruppe, fastsat af en Kæde og gældende for dens Tilbud, enten permanent eller i en tidsbegrænset Rabatperiode. Rabatter lægges aldrig sammen med hinanden eller med en Kampagnepris — brugeren får altid den billigste af de muligheder, de har ret til.
_Avoid_: Studiepris (som generelt begreb) — studiepris er blot en Rabat for Rabatgruppen Studerende

**Træn med en makker**:
Rabatgruppen for brugere, der vil melde sig ind sammen med en anden person (fx Fitness X' "Træningsven" eller LOOPs "Familiemedlemskab"). Prisen vises som Makkerpris.
_Avoid_: Træningsven, træningsmakker, duo (kædernes egne produktnavne)

**Makkerpris**:
Prisen pr. person, når to (eller flere) melder sig ind sammen under Rabatgruppen Træn med en makker. Kan være forskellig pr. Aldersgruppe, kan have sin egen kampagne (pris og periode, fx LOOPs familiekampagne) og sit eget Oprettelsesgebyr pr. person (fx Fitness X' engangsbeløb for at tilføje makkeren). Indgår i Ærlig årspris og Kvartalspris som en mulighed på lige fod med Rabatter.

### Bruger og matchning

**Præference**:
Brugerens faste ønsker til et Tilbud (faciliteter, maskiner, Abonnementstype), angivet i onboarding/profil. Bruges som udgangspunkt for Filtre.

**Filter**:
Et midlertidigt krav i oversigten (fx sauna, holdtræning, ingen binding, maks. afstand). Centre, der med sikkerhed ikke opfylder et aktivt Filter, vises ikke. Centre, hvor det er ukendt, vises med mærket "Ikke oplyst". Maks. afstand er altid hård.

**Anbefalet**:
Det Tilbud med lavest Ærlig årspris blandt dem, der med sikkerhed opfylder alle aktive Filtre (ikke "Ikke oplyst"). Uafhængig af hvilken sortering brugeren har valgt.

**Distance**:
Afstanden i luftlinje mellem brugerens placering (adresse eller GPS) og et Center.

**Nuværende medlemskab**:
Det brugeren allerede betaler for, hvis nogen: en månedspris angivet af brugeren selv og eventuelt hvilken Kæde det er hos. Er ikke et Tilbud fra GymFinder. Bruges som sammenligningsgrundlag for Besparelser.

**Favorit**:
Et Center brugeren har gemt for at følge prisen. Prisen der følges er den laveste Ærlig årspris blandt de Tilbud, brugeren kan bruge i det Center.

**Prisalarm**:
En besked til brugeren, når en Besparelse overstiger en tærskel, brugeren kan vælge, idet prisalarmen slås til (fx 50 kr/md). Uden tærskel udløses den ved enhver Besparelse. Udløses enten når et Tilbud bliver billigere end Nuværende medlemskab, eller når en Favorit falder i pris — uanset om faldet skyldes en ny Kampagnepris eller en lavere Standardpris.

**Besparelse**:
Forskellen mellem Nuværende medlemskabs månedspris og et Tilbuds Ærlig årspris — eller mellem en Favorits nuværende og tidligere Ærlig årspris.

### Produkt

**Spar mere-forslag**:
Et forslag om en Rabatgruppe brugeren ikke tilhører endnu, men kunne melde sig ind i (fx Ældre Sagen), hvor Besparelsen overstiger prisen for at blive medlem.

**Ronnie**:
GymFinders maskot og AI-rådgiver. Anbefaler kun Tilbud/Centre fra GymFinder og sammenligner altid på Ærlig årspris.
_Avoid_: Chatbot, AI-assistent (i UI-tekst)
