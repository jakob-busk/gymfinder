# Styling-prototype 2: "Tribune" (Awwwards)

Branch: `proto/styling-2-awwwards`. Bygget efter principperne i
[claude-skill-awwwards](https://github.com/tponscr-debug/claude-skill-awwwards), oversat til React Native.

## Kunstnerisk retning (besluttet før koden)

- **Følelse:** selvsikker og lidt fræk, men troværdig. Man skal mærke energi (fitness) og ro (priser).
- **Branche:** fitness + prisgennemsigtighed. Fitness-apps er typisk mørke, neon eller "sporty gradient";
  GymFinder skiller sig ud ved at ligne en sportsplakat/avis-sportssektion trykt på kalkpapir.
- **Arketype:** *Monochrome + Pop* (varm variant): blæk på papir, én signalfarve og én pop-farve.
- **Idé:** Prisen er helten. Den står som et kæmpe tal, som et resultat på en tavle, og kvitteringen
  på Centerdetalje er en rigtig bon. Ronnie er et klistermærke på en limegrøn sol, der trækker vejret.

## Palette

| Rolle | Farve |
|---|---|
| Baggrund (kalk) | `#EFEBE2` |
| Flade (papir) | `#F8F5EF`, hævet `#E4DED2` |
| Tekst / blæk-blok | `#1B1915` (aldrig ren sort), på blæk `#F3EFE7` |
| Dæmpet tekst | `#6E685D`, svag `#A39C8F` |
| Signal (handlinger, ♥, logo-prik) | `#FF4B1F` |
| Pop (Anbefalet, Ronnies sol, aktiv fane) | `#D7F23C` |
| Besparelse på papir | `#3E7A00` / lys `#EEF6C8` |
| Advarsel / fejl | `#9A5B00` på `#F6E6C4` / `#C42B1C` |
| Linjer | `rgba(27,25,21,0.10)` og `0.28` |

## Skrifttyper (max 2 familier)

- **Bricolage Grotesque** 800 (titler, priser, logo) og 600 (små overskrifter). Stram negativ spærring
  (ca. -4,5 % på titler, -5,5 % på priser), linjehøjde ~0,98.
- **Inter** 400/500/600/700 til al læsetekst. Små versaler med +1,6 spærring som "kickers".
- Fjernet: `@expo-google-fonts/audiowide`, `@expo-google-fonts/monoton`. Tilføjet:
  `@expo-google-fonts/bricolage-grotesque`.

## Vigtigste beslutninger

- **Lys stil:** `DefaultTheme` i stedet for `DarkTheme`, `StatusBar style="dark"`, lys kortstil
  (`brand.mapStyle` + `brand.mapInterfaceStyle = 'light'`), lys tab-bar og header,
  `userInterfaceStyle: light` og kalk-baggrund i `app.json`.
- **Rytme frem for skabelon:** det Anbefalede Center er en mørk blæk-blok (bento-hero) med prisen i lime
  midt i en liste af lyse papirkort. Kort har løbenummer (01, 02 …) og prisen som 52 px tal.
- **Ingen skygger/glød**, ingen gradients. Flader adskilles af tone, ikke af rammer.
- **Former:** kort 22 px, store blokke 30 px, knapper/mærker/felter som piller, kvitteringen skarp (6 px).
- **Felter** er "blanket-linjer" (papir med tyk blæklinje under) i stedet for kasser.
- **Bevægelse** (kun transform/opacity, `useNativeDriver` kun uden for web, kurve `power4.out`):
  - `Reveal`: forskudt indtoning (70 ms pr. element, max 8) af kort på Find og Favoritter, profilgrupper,
    chatbeskeder, Ronnie-forslag, faciliteter og alle dele af Velkomst.
  - Tryk-feedback: alle knapper fjedrer ind (`usePressScale`), ♥ slår et slag.
  - Segment-valg (maks. afstand): sort pille glider mellem valgene med fjeder.
  - Fanebjælke: lime pille vokser frem bag aktivt ikon.
  - Onboarding: fremdriftsbjælke i 6 streger, hvor det aktuelle trin fyldes op.
  - Centerdetalje: kvitteringen toner ind igen, når man skifter Tilbud.
  - Levende detaljer: logoets orange prik pulserer; på Velkomst vipper Ronnie og hans sol "trækker
    vejret" i et andet tempo; et skråt blæk-bånd med prisbegreberne (Ærlig årspris, Oprettelsesgebyr,
    Admingebyr, Kampagnepris, Rabat) løber stille forbi.
- **App-ikon, splash, favicon og Android-ikon** er genereret på ny: Ronnie på lime sol på kalkpapir
  (splash med "GymFinder" + orange prik).

## Strukturelle komponentændringer

- Nye: `components/Reveal.js`, `components/usePressScale.js`, `components/Marquee.js`, `components/TabIcon.js`.
- `ButtonComponent`: gradient fjernet, Animated-wrapper med tryk-skala, ny prop `onInk`.
- `BrandLogo`: ét ord "GymFinder" + pulserende prik (før to farvede ord i neon).
- `ScreenHeader`: neonlinje → blæklinje, titel toner ind.
- `RonnieMascot`: sol bag stor/lille Ronnie, rund lime-ramme om avatar/tiny, åndedræt på `large`, ny prop `style`.
- `SegmentedControl`: glidende indikator. `OnboardingStep`: fremdriftsbjælke + Reveal.
- `CenterCard`: løbenummer, stort pristal med enhed ved siden af, mørk blok for Anbefalet, ny prop `index`.
- `FavoriteButton`: rund knap + hjerteslag, prop `onInk`. `NotStatedRow`: prop `onInk`.
- `CenterPinInfo` og Favoritter-kort: prisen som stort tal i stedet for en tekstlinje.
- `WelcomeScreen`: ny opbygning (logo, kæmpe overskrift med lime-markeret "billigst", Ronnie til højre,
  bånd, nummererede punkter 01-03 i stedet for ikoner). Samme tekster.
- `App.js`: lyst tema, `TabIcon`, outline-ikoner for inaktive faner.
- Små: `Chip` (sort valgt + lime flueben), `ToggleRow` (blæk-spor, lime tommelfinger), `SettingsRow`
  (pil frem i blæk), `CenterMap.web` (piller uden 📍), `MapLegend` (antal i versaler).

## Linjetal `styles/GlobalStyle.js`

Før: 1220. Efter: 1407 (flere styles til de nye præsentationsdele + `motion`-eksport og hjælpere `display()`/`kicker`).

## Kendte svagheder

- Lime `#D7F23C` som pin-farve på Android (`pinColor`) kan blive afrundet til nærmeste nuance.
- `fontVariant: tabular-nums` virker ikke med Bricolage, så store pristal har proportionale cifre.
- Ronnie-billedet har stadig pink/turkis svedbånd fra neon-temaet; de passer kun nogenlunde til paletten.
- Velkomst er høj; på små skærme (< 700 px) skal man scrolle lidt for at se knapperne (ScrollView).
- Ingen `prefers-reduced-motion`-gren endnu (RN's `AccessibilityInfo.isReduceMotionEnabled` kunne bruges).
- `expo-linear-gradient` er ikke længere importeret nogen steder, men pakken er bevaret (kun fontpakker
  skulle ryddes).
- Animationer er ikke testet på fysisk enhed i denne runde, kun bundlet på web.
