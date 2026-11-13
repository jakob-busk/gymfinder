# Styling-prototype 7: "Tribune, men venlig" (blanding af 2 og 6)

Branch: `proto/styling-7-blanding`, lavet ud fra `proto/styling-2-awwwards`.

## Idé

Strukturen og bevægelsen fra Tribune (variant 2), men med varmen fra Varm og venlig (variant 6).
Prisen er stadig helten: store pristal, det Anbefalede Center som en mørk blæk-blok mellem lyse kort,
løbenumre og lister, der toner ind forskudt. Ovenpå kommer creme papir, rundere hjørner, runde
skrifter og Ronnie på en lys cirkel med talebobler. Stilen er bevidst rolig: få farver og lette
vægte. Farverne har tre roller: **violet = handling, mint = godt nyt, blæk = alt andet**. Ingen af
dem ligner en Kæde (Fitness X er orange, PureGym grøn/turkis, SATS rød/mørkeblå).

## Palette

Kun to flader og tre roller. Ingen pasteller, ingen sand-flade, ingen gul og ingen ekstra grøn/blå.

| Rolle | Farve |
|---|---|
| Baggrund (creme) | `#FDF1E0` |
| Flade (lyst papir, også felter, segment-spor og kort på web) | `#FFFCF7` |
| Blæk: tekst, blæk-blok, andre Centre-pins, advarsler | `#1B1915`, på blæk `#F7F1E8` / dæmpet `#A8A193` |
| Dæmpet tekst og løbenumre | `#6B6358` |
| Linjer og spor | blæk med 10 % / 24 % gennemsigtighed |
| Handling: knapper, ♥, logo-prik, aktiv fane, kontakter, din placering | violet `#5B3CD6`, tekst på den `#FFFCF7` |
| Lys violet: Ronnies cirkel (altid samme farve) | `#E7E0FB` |
| Godt nyt: Anbefalet-mærke og -pin, pris i blæk-blok, "billigst" | mint `#8EEBC0` med blæk-tekst |
| Besparelse på lyst papir | mintgrøn `#17734F` på `#DDF5E8` |
| Fejl (dæmpet) | `#B4382E` |

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
| Mintgrøn `#17734F` på baggrund / flade / mint-pille | 5,2 / 5,7 / 5,1 |
| Mint `#8EEBC0` på blæk (pris i blæk-blok) og blæk på mint (mærker) | 12,4 |
| Lys tekst / dæmpet tekst på blæk (også løbenummer i blæk-blokken) | 15,6 / 6,8 |
| Fejl `#B4382E` på baggrund | 5,3 |
| Blæk på lys violet (Ronnie-cirkel) | 13,8 |
| Inaktiv fane `#6B6358` | 5,3 |

### Kædernes farver

Appen har ingen kædelogoer (`components/BrandLogo.js` er kun GymFinders eget logo, og hverken
`assets/` eller `data/` har kædelogoer). Tjekket mod kædernes kendte farver: Fitness X (orange),
PureGym (grøn/turkis og navy), SATS (rød og mørkeblå), LOOP Fitness. Violet `#5B3CD6` (farvetone ca.
252°) ligger tydeligt mellem SATS' blå og de røde/orange toner og kan ikke forveksles med nogen af dem.
Mint ligger i det grønne område, men er en lys pastel, der kun bruges til besparelser/Anbefalet,
aldrig til handlinger.

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

## Regel: ingen versaltekst

Ingen tekst står i versaler med spærring (det opleves som et "AI-design-spor"). Etiketter, mærker,
trintæller, kortforklaring og løbenumre skrives med stort begyndelsesbogstav (fx "Anbefalet",
"Billigst her", "Trin 1 af 6", "5 Centre inden for 15 km") og får hierarki med vægt, størrelse og
farve. `kicker` har derfor hverken `textTransform: 'uppercase'` eller positiv spærring, og
gruppeoverskrifter (Maks. afstand, Krav, Maskiner) er små Fredoka-titler i blæk.

## Taget fra 2 (Tribune)

Lys stil og navigationstema, layout-rytmen, store pristal, blæk-blokken for Anbefalet, løbenumre,
fremdriftsbjælken i onboarding, felter som blanket-linjer, glidende segment-indikator, tab-pille,
`Reveal`, `usePressScale`, `Marquee`, den pulserende logo-prik, ingen skygger og ingen gradients.

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
- Færre farver: `brand.ronnieTones`, pastellerne og `surfaceRaised` er fjernet. `ToggleRow` er
  violet, når den er slået til; `Chip` har et lyst flueben på blæk; løbenummeret i blæk-blokken er
  lyst dæmpet. `AskRonnieScreen` og `CenterDetailScreen` har et ikon ved advarslens titel.
- `TabIcon`: violet pille med lyst ikon. `GlobalStyle`: ny `figure()` til priser, `ronnieStage()`.
- `app.json`: baggrunde `#FDF1E0`. App-ikon, favicon, Android-ikoner og splash er genereret på ny
  med Pillow (Ronnie på lys violet cirkel på creme; splash med "GymFinder" i Fredoka 600 og violet prik).
  Monokrom-ikonet er uændret.

## Linjetal `styles/GlobalStyle.js`

Før (variant 2): 1407. Efter: 1472 (`figure()`, Ronnie-scener, taleboble-spidser og advarsels-
ikonrække; pasteller og `ronnieTones` er fjernet igen). Oprindeligt på `main`: 1220.

## Kendte svagheder

- Ronnies svedbånd er pink/turkis/lilla; lilla passer fint til violet, turkis lidt mindre.
- Mint-pinnen for Anbefalet er lys (1,2:1 mod kortet). Den skiller sig ud fra de mørke pins, men
  står svagt mod selve kortet, og Android kan runde `pinColor` af til nærmeste standardnuance.
- Ronnies cirkel (lys violet) ligger tæt på cremen (1,14:1); den er pynt, så det er bevidst blødt.
- Velkomst er blevet lidt højere af taleboblen; på små skærme skal man scrolle (ScrollView).
- Logo-prikken og båndet på Velkomst bevæger sig stadig, selv med "reducer bevægelse" (kun Ronnie
  respekterer indstillingen).
- Animationer er kun bundlet på web, ikke afprøvet på fysisk enhed.
- `expo-linear-gradient` er stadig installeret, men bruges ikke.
