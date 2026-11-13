# Nielsen-fund, del B

Branch `proto/styling-7-nielsen-b` (fra `proto/styling-7-blanding`). Én commit pr. fund, så hvert fund
kan rulles tilbage for sig (`git revert <hash>`). `npm test` er grøn efter hver commit, og
`npx expo export --platform web` bygger.

| Fund | Commit | Kort beskrivelse | Valg |
|---|---|---|---|
| L4 | `ae8ad5e` | Reveal 340 ms (før 760), forskydning 50 ms kun for de første 3 elementer (før 70 ms × 8). Knapperne på Velkomst animeres ikke. Reveal, Marquee, logo-prikken, tryk-fjederen og fremdriften i onboarding står stille ved "reducer bevægelse". | Ny hook `components/useReduceMotion.js` (`isReduceMotionEnabled` + `reduceMotionChanged`-lytter). Onboardingens hovedknap var allerede uden Reveal; kun fremdriftsstregen er gjort hurtigere. `RonnieMascot` er ikke ændret (respekterede allerede indstillingen, dog uden lytter). |
| L16 | `1fa2ded` | Båndet på Velkomst er fjernet; `Marquee.js` og dens styles er slettet. | Lidt mere luft mellem delene (gap 18 → 24). Punkterne er uændrede. |
| L8 | `9d1c35e` | "Adgang til flere centre"/"Flere centre" → "Landsdækkende" med forklaringen "Adgang til alle Kædens Centre, ikke kun ét Lokalt Center". "Ikke oplyst: Abonnementstype" → "Ikke oplyst: Landsdækkende". | Tippet på Find i `data/findView.js` (+ test) siger nu "Slå Landsdækkende fra". Ingen "De første 3 mdr." i mine filer (kun i CenterCard, del A). |
| L10 | `2905ad6` | Konto- og Ronnie-fejl uden Firebase-stier, fejlkoder, OpenAI-nøgle og README. Tekniske noter står i `console.warn`. | Opsætningsfejl: "Konto virker ikke lige nu. Du kan fortsætte uden konto." Ukendt kode: "Noget gik galt. Prøv igen om lidt." Tests er rettet og tjekker også, at noten havner i konsollen. |
| L13 | `9e3867e` | "Fortsæt anonymt" er en tekstknap; "Opret konto" bliver primær, når formularen er udfyldt. Udfyldt formular + "Fortsæt anonymt" giver en bekræftelse. | Bekræftelsen bruger appens `Alert` med to knapper. På web gør react-native-webs `Alert` ingenting, så `components/confirm.js` bruger `window.confirm` dér. Uden Firebase er "Fortsæt anonymt" stadig primær (det er eneste valg). |
| L17 | `dbaffa9` | Forklaring over spærret Næste (adresse, fødselsdato). Ingen titel i topbjælken under onboarding. Spørg Ronnie: "Ronnie tænker …" i en taleboble, ny velkomst, knap til Find, når Ronnie holder fri, og en forklaring, når Send er spærret. Om GymFinder: "Sådan virker det". Sorteringsnavne. | Sorteringen står nu kun på Find (fjernet fra Filtre). "Ærlig årspris, dyrest først" er beholdt, fordi den er testet i `matchning.test.js` og `filterSettings.test.js`. Affiliate-teksten bygger på, at `data/matchning.js` ikke bruger nogen aftale- eller provisionsdata. Der findes ingen kontaktadresse i repoet, så "Kontakt" har ingen e-mail. Den skal tilføjes. Rute-navnet "Om os" er beholdt, og titlen er "Om GymFinder". |
| Ekstra | `1ab3b7e` | Velkomst: "Fitnesscentret, der reelt er bedst for dig." Markeringen står på " bedst ". | Taglinen fandtes ikke i app.json, README, splash eller tests. |
| F3 | `41ac484` | Et tomt eller ugyldigt prisfelt nulstiller Nuværende medlemskab og siger det. Næste er spærret med "Skriv din månedspris, eller vælg Ingen.", når "Jeg er medlem et sted" er valgt uden pris. | Kæden huskes lokalt, mens feltet er tomt. "249," regnes stadig som "i gang med at skrive". |
| F4 | `34775a6` | "Spring over" vises kun, så længe intet er valgt, og går bare videre uden at nulstille. | Begrundelse: med et valg ville "Spring over" og "Næste" stå side om side og betyde næsten det samme. Det er forvirrende, og en knap, der stille sletter valg, er værre. Med valg er "Næste" den eneste knap. |
| F5 | `4f8c782` | `useUserProfile` har nu `saveStatus`. Redigér profil viser "Gemmer …", "Gemt" eller "Kun gemt på telefonen" for brugere, der er logget ind. | `saveUserProfile` kaster fejlen med `savedLocally = true`, når databasen fejler. Ny test. Anonyme brugere ser stadig "Ændringer gemmes med det samme". |
| F6 | `8a7fa86` | Filtre: "Filtre nulstillet · Fortryd" i 5 sek. Spørg Ronnie: "Ny samtale" i toppen. Et færdigt spørgsmål fra Centerdetalje overskriver ikke det, brugeren har skrevet. | `useFilterSettings.reset` returnerer det gamle, og en ny `restore` sætter det tilbage. Det færdige spørgsmål står som knap over feltet, når der allerede er skrevet noget. "Ny samtale" beholder det, der står i feltet. |
| F7 | `99cc033` | Prisalarmen husker den sidste tærskel, når den slås fra og til igen. | Huskes i komponenten, så længe kortet er åbent. Skal den huskes efter genstart, kræver det en ændring i `services/Favorites.js`/`PriceAlerts.js` (del A's område). |

## Filer, der også kan være rørt af del A

- `styles/GlobalStyle.js`: `motion` (L4), Velkomst/Marquee-styles (L16), en kommentar ved
  `welcomeHighlight` og en samlet blok nederst ("Usability-rettelser (Nielsen, del B)").
- `data/findView.js` og `data/findView.test.js` (L8): bruges af Find.
- `components/Reveal.js` (L4): bruges også af CenterCard, CenterDetail og Favoritter.
- `App.js` (L17, F5).
