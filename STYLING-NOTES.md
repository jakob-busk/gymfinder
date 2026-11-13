# Styling-prototype 7: "Tribune, men venlig" (blanding af 2 og 6)

Branch: `proto/styling-7-blanding`, lavet ud fra `proto/styling-2-awwwards`.

## Idé

Strukturen og bevægelsen fra Tribune (variant 2), men med varmen fra Varm og venlig (variant 6).
Prisen er stadig helten: store pristal, det Anbefalede Center som en mørk blæk-blok mellem lyse kort,
løbenumre og lister, der toner ind forskudt. Ovenpå kommer creme papir, rundere hjørner, runde
skrifter og Ronnie på pastelcirkler med talebobler. Paletten er ny, så ingen farve ligner en Kæde:
Fitness X er orange, PureGym grøn/turkis og SATS rød/mørkeblå. Handlinger er derfor dyb violet, og
det gode nyt (besparelse, Anbefalet) er mint.

## Palette

| Rolle | Farve |
|---|---|
| Baggrund (creme) | `#FDF1E0` |
| Flade (papir) / sand | `#FFFCF7` / `#F7E4CC` |
| Tekst og blæk-blok | `#1B1915` (aldrig ren sort), på blæk `#F7F1E8`, dæmpet på blæk `#A8A193` |
| Dæmpet tekst | `#6B6358` |
| Pynt (kun løbenumre) | `#A39C8F` |
| Handling, logo-prik, ♥, aktiv fane | violet `#5B3CD6`, tekst på den `#FFFCF7`, lys `#E7E0FB` |
| Pop på blæk-blok, Anbefalet-mærke, "billigst" | mint `#8EEBC0` med blæk-tekst |
| Besparelse på lyst papir | mintgrøn `#17734F` på `#DDF5E8` |
| Pins | Anbefalet `#34C98A`, andre Centre `#1B1915`, dig `#2F7BF6` |
| Advarsel / fejl (dæmpet) | `#8A5A00` på `#FFF1CF` / `#B4382E` |
| Pasteller (Ronnies cirkler) | fersken `#FFD8C2`, mint `#CDEFDC`, lavendel `#E3DAFB`, solgul `#FFE59A` |

Baggrunden er en tand dybere end 6's `#FFF6EA`: ellers kan papirkortene (`#FFFCF7`) ikke ses, nu hvor
der ikke er skygger (forskel 1,09:1, samme som i variant 2).

### Kontrast (WCAG, udregnet)

| Par | Forhold |
|---|---|
| Brødtekst `#1B1915` på baggrund / flade / sand | 15,7 / 17,2 / 14,1 |
| Dæmpet `#6B6358` på baggrund / flade / sand | 5,3 / 5,8 / 4,8 |
| **Tekst `#FFFCF7` på primærknap `#5B3CD6`** | **6,7** |
| Violet tekst på baggrund / flade (aktiv fane, løbenumre på Velkomst) | 6,2 / 6,7 |
| Mintgrøn `#17734F` på baggrund / flade / mint-pille | 5,2 / 5,7 / 5,1 |
| Mint `#8EEBC0` på blæk (pris i blæk-blok) og blæk på mint (mærker) | 12,4 |
| Lys tekst / dæmpet tekst på blæk | 15,6 / 6,8 |
| Fejl `#B4382E` på baggrund | 5,3 |
| Advarsel `#8A5A00` på `#FFF1CF` | 5,3 |
| Inaktiv fane `#6B6358` | 5,3 |
| Løbenummer `#A39C8F` på flade | 2,7 (kun pynt, ikke læsetekst) |

### Kædernes farver

Appen har ingen kædelogoer (`components/BrandLogo.js` er kun GymFinders eget logo, og hverken
`assets/` eller `data/` har kædelogoer). Tjekket mod kædernes kendte farver: Fitness X (orange),
PureGym (grøn/turkis og navy), SATS (rød og mørkeblå), LOOP Fitness. Violet `#5B3CD6` (farvetone ca.
252°) ligger tydeligt mellem SATS' blå og de røde/orange toner og kan ikke forveksles med nogen af dem.
Mint ligger i det grønne område, men er en lys pastel, der kun bruges til besparelser/Anbefalet,
aldrig til handlinger.

## Skrifttyper

- **Nunito** 400/600/700/800 til al tekst og alle priser. Store pristal (52 og 40 px) er Nunito
  ExtraBold med `tabular-nums` (ny hjælper `figure()`), så tallene står i lige kolonner. Det løser
  2's svaghed med proportionale cifre i Bricolage.
- **Fredoka** 700 til titler, logo og bånd, 600 til små overskrifter og taleboblen på Velkomst.
- Spærring: Fredoka er bred og rund, så 2's -4,5 % fik bogstaverne til at klumpe. Titler har nu
  -1,5 % (modaler og sektioner -1 %), logoet ca. -1,5 %. Linjehøjde 1,04 i stedet for 0,98, fordi
  Fredoka har høje Æ/Ø/Å. Priser har -3 til -3,5 %.
- Fjernet: `@expo-google-fonts/bricolage-grotesque` og `@expo-google-fonts/inter`. Tilføjet:
  `@expo-google-fonts/fredoka` og `@expo-google-fonts/nunito`.

## Taget fra 2 (Tribune)

Lys stil og navigationstema, layout-rytmen, store pristal, blæk-blokken for Anbefalet, løbenumre,
fremdriftsbjælken i onboarding, felter som blanket-linjer, glidende segment-indikator, tab-pille,
`Reveal`, `usePressScale`, `Marquee`, den pulserende logo-prik, ingen skygger og ingen gradients.

## Taget fra 6 (Varm og venlig)

- Skrifterne (se ovenfor).
- Ronnie: farvet cirkel bag ham, der følger positur (`brand.ronnieTones`), ny størrelse `hint`,
  avatar som farvet cirkel, pop-ind med fjeder og et roligt vip i store/små størrelser, der slås fra
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
- `TabIcon`: violet pille med lyst ikon. `GlobalStyle`: ny `figure()` til priser, `ronnieStage()`.
- `app.json`: baggrunde `#FDF1E0`. App-ikon, favicon, Android-ikoner og splash er genereret på ny
  med Pillow (Ronnie på ferskencirkel på creme; splash med "GymFinder" i Fredoka og violet prik).
  Monokrom-ikonet er uændret.

## Linjetal `styles/GlobalStyle.js`

Før (variant 2): 1407. Efter: 1480 (pasteller, `ronnieTones`, `figure()`, Ronnie-scener og
taleboble-spidser). Oprindeligt på `main`: 1220.

## Kendte svagheder

- Ronnies svedbånd er pink/turkis/lilla; lilla passer fint til violet, turkis lidt mindre.
- Løbenumrene (`#A39C8F`) har kun 2,7:1; de er pynt, men kan gøres mørkere, hvis de skal læses.
- Mint `#34C98A` som `pinColor` på Android kan blive afrundet til nærmeste standardnuance.
- Velkomst er blevet lidt højere af taleboblen; på små skærme skal man scrolle (ScrollView).
- Logo-prikken og båndet på Velkomst bevæger sig stadig, selv med "reducer bevægelse" (kun Ronnie
  respekterer indstillingen).
- Animationer er kun bundlet på web, ikke afprøvet på fysisk enhed.
- `expo-linear-gradient` er stadig installeret, men bruges ikke.
