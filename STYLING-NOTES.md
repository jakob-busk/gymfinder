# Styling-prototype 7: "Tribune, men venlig" (blanding af 2 og 6)

Branch: `proto/styling-7-blanding`, lavet ud fra `proto/styling-2-awwwards`.

## Idé

Strukturen og bevægelsen fra Tribune (variant 2), men med varmen fra Varm og venlig (variant 6).
Prisen er stadig helten: store pristal, det Anbefalede Center som en mørk blæk-blok mellem lyse kort,
løbenumre og lister, der toner ind forskudt. Ovenpå kommer creme papir, rundere hjørner, runde
skrifter og Ronnie på en lys cirkel med talebobler. Stilen er bevidst rolig: få farver og lette
vægte. Paletten er kun **creme/papir, blæk og violet** (plus dæmpet rød til fejl): violet er kun
handling, blæk er alt andet. Ingen af dem ligner en Kæde (Fitness X er orange, PureGym grøn/turkis,
SATS rød/mørkeblå).

## Palette

Kun to flader og to farver oven på dem. Ingen mint, ingen pasteller, ingen sand-flade og ingen gul.

| Rolle | Farve |
|---|---|
| Baggrund (creme) | `#FDF1E0` |
| Flade (lyst papir, også felter, segment-spor og kort på web) | `#FFFCF7` |
| Blæk: tekst, blæk-blok, Centre-pins, advarsler, godt nyt | `#1B1915`, på blæk `#F7F1E8` / dæmpet `#A8A193` |
| Dæmpet tekst og løbenumre | `#6B6358` |
| Linjer og spor | blæk med 10 % / 24 % gennemsigtighed |
| Handling: knapper, ♥, logo-prik, aktiv fane, kontakter, "du er her" | violet `#5B3CD6`, tekst på den `#FFFCF7` |
| Lys violet: Ronnies cirkel (altid samme farve) | `#E7E0FB` |
| Fejl (dæmpet) | `#B4382E` |

### Godt nyt uden ekstra farve

- **Anbefalet** er stadig den mørke blæk-blok; prisen står i lys `#F7F1E8`.
- **Mærker** (Anbefalet, Billigst her) er en lys pille (`#F7F1E8`) med 1,5 px blæk-kant og blæk-tekst.
  Den samme pille virker på blæk-blokken og på lyst papir.
- **Besparelse og prisfald** er en creme pille med blæk-kant og halvfed blæk-tekst.
- **"billigst" på Velkomst** står omvendt: lys tekst på en blæk-markering.
- **Kortpins:** Anbefalet er en stor papirprik med tyk blæk-ring (24 px), andre Centre er små
  blækprikker med papirkant (14 px), "du er her" er en violet pin. På web er Anbefalet en papirpille
  med blæk-kant, de andre blæk-piller. Forklaringen under kortet bruger de samme prikker.
- **Bånd og fanepriser:** stjernen i Velkomst-båndet og prisen på det aktive Tilbud er dæmpet lys
  på blæk.

Advarsler (fx "Prisen stiger, når du fylder 30") har ingen egen farve: lyst papir, blæk-kant og et
`alert-circle-outline`-ikon ved titlen. Kortstilen (Android) er neutral creme/grå uden farvede veje.
Baggrunden er en tand dybere end 6's `#FFF6EA`: ellers kan papirkortene (`#FFFCF7`) ikke ses uden
skygger (forskel 1,09:1, samme som i variant 2).

### Kontrast (WCAG, udregnet)

| Par | Forhold |
|---|---|
| Brødtekst `#1B1915` på baggrund / flade | 15,7 / 17,2 |
| Dæmpet `#6B6358` på baggrund / flade | 5,3 / 5,8 |
| **Tekst `#FFFCF7` på primærknap `#5B3CD6`** | **6,7** |
| Violet på baggrund / flade (aktiv fane) | 6,2 / 6,7 |
| Lys tekst `#F7F1E8` på blæk (pris i blæk-blok) | 15,6 |
| Dæmpet lys `#A8A193` på blæk | 6,8 |
| Blæk-tekst på lys mærke-pille `#F7F1E8` | 15,6 |
| Fejl `#B4382E` på baggrund | 5,3 |
| Blæk på lys violet (Ronnie-cirkel) | 13,8 |
| Inaktiv fane `#6B6358` | 5,3 |

### Kædernes farver

Appen har ingen kædelogoer (`components/BrandLogo.js` er kun GymFinders eget logo, og hverken
`assets/` eller `data/` har kædelogoer). Tjekket mod kædernes kendte farver: Fitness X (orange),
PureGym (grøn/turkis og navy), SATS (rød og mørkeblå), LOOP Fitness. Violet `#5B3CD6` (farvetone ca.
252°) ligger tydeligt mellem SATS' blå og de røde/orange toner og kan ikke forveksles med nogen af dem.

## Skrifttyper og vægte

Et trin lettere end første udgave af 7, så det føles roligt, men stadig har Tribunes rytme.

- **Nunito** 400 til brødtekst (også det, der før var 600 "medium"), 600 til fremhævninger,
  knapper, mærker og etiketter, og 700 kun til store pristal med `tabular-nums` (hjælper
  `figure()`). Nunito 800 bruges ikke længere.
- **Fredoka** 600 til titler, logo, korttitler og bånd, 500 til små overskrifter (gruppetitler,
  infobokse, taleboblen på Velkomst). Fredoka 700 bruges ikke længere.
- Størrelser: titler 30 px (før 34), Velkomst-overskrift 34 (før 40), modaler 22, ark 24, sektioner
  20. Pris på kort 44 px (før 52), store priser på Centerdetalje og kvittering 34 (før 40), ca. 15 %
  mindre. Blæk-blokken har 20 px lodret luft (før 24).
- Spærring: Fredoka er bred og rund, så titler har kun -1,5 % (2 havde -4,5 %). Linjehøjde 1,04,
  fordi Fredoka har høje Æ/Ø/Å. Priser har -3 %.
- Indlæste skrifter: Fredoka 500/600 og Nunito 400/600/700. Fjernet: `@expo-google-fonts/bricolage-grotesque`
  og `@expo-google-fonts/inter`. Tilføjet: `@expo-google-fonts/fredoka` og `@expo-google-fonts/nunito`.

## Kædelogoer

- Logoerne (`assets/chains/puregym.png`, `sats.png`, `loop.png`, `fitnessx.png`, sorte på
  gennemsigtig baggrund) står i stedet for Kædens navn, forrest i Centrets titel (se nedenfor). Sætninger,
  der nævner Kæden ("Åbner … på {Kæde}s egen side", kvitteringen, Ronnie, Nuværende medlemskab),
  bruger stadig navnet som tekst.
- **Titellinjen** for et Center er én linje i `components/CenterTitle.js`: [logo-pille] [pin
  (`location-sharp`, blæk på lyst, `onInk` på blæk-blokken)] [Centrets navn]. Pille og pin står i et
  forspand med samme højde som navnets første linje, så de står på linje med det; bryder navnet,
  brydes det under sig selv. Afstanden står på en dæmpet linje under (på Centerdetalje: adresse ·
  afstand). Bruges i `CenterCard`, Favoritter, `CenterPinInfo` og på Centerdetalje. Skærmlæsere hører
  "Kæde, Centernavn" én gang; logo og pin er skjult (`aria-hidden`), og på kortet på Find har
  titel-knappen selv den tekst.
- **Navnet uden Kæde:** ved siden af logoet står Centrets navn uden Kædens navn foran ("Fitness X
  Lyngby" → "Lyngby", "LOOP Viborg" → "Viborg"). Ren funktion `centerDisplayName` i
  `data/centerDisplayName.js` (med test); LOOP har aliaset "LOOP", da Centrene ikke hedder "LOOP
  Fitness …". Har Kæden intet logo, eller bliver navnet tomt, står det fulde navn. Kun visningen
  ændres; sætninger, der nævner Centret, bruger det fulde navn.
- **Afstemte størrelser** (pillens højde = navnets linjehøjde, ens luft på 6 px):

  | Variant | Navn | Linjehøjde / pille | Pin | Logo: PureGym / SATS / Fitness X / Loop |
  |---|---|---|---|---|
  | Boksen på kortet | Fredoka 500, 16 px | 20 px | 14 px | 12 / 9 / 8 / 7 px |
  | Kort (Find, Favoritter) | Fredoka 500, 18 px | 22 px | 16 px | 14 / 10 / 9 / 8 px |
  | Centerdetalje | Fredoka 600, 24 px | 28 px | 20 px | 17 / 13 / 12 / 10 px |
- `components/ChainLogo.js` slår op på Kædens id (samme id som i `scraper/chains`). Kæder uden logo
  får navnet som tekst i pillen.
- Udseende: lyst logo (`#F7F1E8` via `tintColor`) på en blæk-pille med samme højde for alle
  Kæder. På blæk-blokken får pillen en svag lys kant (`#A8A193` ved 45 %), så den kan ses.
- Optiske grundhøjder i en 26 px pille: PureGym 16 px, SATS 12 px, Fitness X 11 px, Loop 9 px;
  de skaleres med pillens højde.
- `tintColor` virker på web: react-native-web 0.21 laver et SVG-filter (`url(#tint-…)`), når
  `tintColor` står i Image-stilen. Det er tjekket i kildekoden og den eksporterede bundle, men ikke
  set i en browser.
- **Logoerne er Kædernes varemærker.** Brugsretten skal afklares med Kæderne før en udgivelse.

## Regel: ingen versaltekst

Ingen tekst står i versaler med spærring (det opleves som et "AI-design-spor"). Etiketter, mærker,
trintæller, kortforklaring og løbenumre skrives med stort begyndelsesbogstav (fx "Anbefalet",
"Billigst her", "Trin 1 af 6", "5 Centre inden for 15 km") og får hierarki med vægt, størrelse og
farve. `kicker` har derfor hverken `textTransform: 'uppercase'` eller positiv spærring, og
gruppeoverskrifter (Maks. afstand, Krav, Maskiner) er små Fredoka-titler i blæk.

## Taget fra 2 (Tribune)

Lys stil og navigationstema, layout-rytmen, store pristal, blæk-blokken for Anbefalet, løbenumre,
fremdriftsbjælken i onboarding, felter som blanket-linjer, glidende segment-indikator, tab-pille,
`Reveal`, `usePressScale`, den pulserende logo-prik (båndet `Marquee` er fjernet igen, se L16), ingen skygger og ingen gradients.

## Taget fra 6 (Varm og venlig)

- Skrifterne (se ovenfor).
- Ronnie: cirkel bag ham (nu altid lys violet i stedet for 6's pasteller pr. positur), ny størrelse
  `hint`, avatar som cirkel, pop-ind med fjeder og et roligt vip i store/små størrelser, der slås fra
  ved "reducer bevægelse" (`AccessibilityInfo.isReduceMotionEnabled`). Erstatter Ronnie på lime sol.
- Talebobler med spids: `RonnieHint`, Ronnies første besked i Spørg Ronnie og "Hej, jeg er Ronnie!"
  over Ronnie på Velkomst.
- Varmen: creme baggrund, rundere hjørner (kort 24, blokke 32, kvittering 12 i stedet for 6, felter
  16 foroven, faciliteter 20), tykkere og afrundet fremdriftsbjælke og headerlinje.

## Strukturelle ændringer (i forhold til variant 2)

- `RonnieMascot`: ny opbygning med cirkel-scene pr. størrelse (som i 6), `motion`-hook med
  reducer-bevægelse, behold prop `style`. Lime-badges og åndende sol er fjernet.
- `RonnieHint`: Ronnie (`hint`) + taleboble med spids i stedet for lime boks.
- `WelcomeScreen`: taleboble over Ronnie; Ronnie og boblen står i samme `Reveal`. Samme tekster.
- `AskRonnieScreen`: spids på Ronnies første taleboble.
- `LoginScreen`: Ronnie er fjernet, så reglen "kun ved godt nyt, aldrig ved login" overholdes.
- Versaler fjernet: mærkerne "ANBEFALET"/"BILLIGST HER" (CenterCard, CenterPinInfo, OfferReceipt),
  `kicker`-stilen, spærring på fanetitler og datoformatet "DD-MM-ÅÅÅÅ" → "dd-mm-åååå" (felt og fejltekst).
- Færre farver: `brand.ronnieTones`, pastellerne, `surfaceRaised` og hele mint-familien (`accent*`,
  `badgeBackground`, `recommendedPin`, `centerPin`) er fjernet. `CenterMap` tegner Centrene som
  egne prikker (`mapPinRecommended`/`mapPinCenter`) i stedet for `pinColor`; `CenterMap.web` og
  `MapLegend` bruger de samme styles. `ToggleRow` er
  violet, når den er slået til; `Chip` har et lyst flueben på blæk; løbenummeret i blæk-blokken er
  lyst dæmpet. `AskRonnieScreen` og `CenterDetailScreen` har et ikon ved advarslens titel.
- `TabIcon`: violet pille med lyst ikon. `GlobalStyle`: ny `figure()` til priser, `ronnieStage()`.
- `app.json`: baggrunde `#FDF1E0`. App-ikon, favicon, Android-ikoner og splash er genereret på ny
  med Pillow (Ronnie på lys violet cirkel på creme; splash med "GymFinder" i Fredoka 600 og violet prik).
  Monokrom-ikonet er uændret.

## Linjetal `styles/GlobalStyle.js`

Før (variant 2): 1407. Efter: 1592 (`figure()`, Ronnie-scener, taleboble-spidser, advarsels-
ikonrække, pin-prikker, kædelogo-pillen og titellinjen; pasteller, mint og `ronnieTones` er fjernet igen). Oprindeligt på `main`: 1220.

## Kendte svagheder

- Ronnies svedbånd er pink/turkis/lilla; lilla passer fint til violet, turkis lidt mindre.
- Centrene er nu egne prikker på kortet (native) i stedet for standard-pins. De er ikke afprøvet på
  en telefon; på Android kan egne markører i sjældne tilfælde blive klippet eller tegnet forsinket.
- Uden en farve til godt nyt hviler alt på form (blok, kant, pille). Det er roligt, men Anbefalet på
  web-pillerne og i forklaringen er mindre iøjnefaldende end før.
- Ronnies cirkel (lys violet) ligger tæt på cremen (1,14:1); den er pynt, så det er bevidst blødt.
- Velkomst er blevet lidt højere af taleboblen; på små skærme skal man scrolle (ScrollView).
- `Reveal`, logo-prikken, tryk-fjederen og fremdriften i onboarding respekterer nu
  "reducer bevægelse" (`useReduceMotion` lytter på `reduceMotionChanged`). Reveal tager 340 ms og
  forskyder kun de første 3 elementer med 50 ms; knapperne på Velkomst animeres ikke.
- Animationer er kun bundlet på web, ikke afprøvet på fysisk enhed.
- `expo-linear-gradient` er stadig installeret, men bruges ikke.
