# Kodestandard

- Brug ordene fra `CONTEXT.md` i kommentarer og dokumentation. Kommentarer og UI-tekst skrives på dansk, mens navne i koden er på engelsk.
- UI-tekst følger tabellen "Sproget i appen" nedenfor, ikke ordlistens stavemåde.
- Hver skærm starter med `// Ansvarlig: <navn>`.
- Nøgler og hemmeligheder ligger kun i `.env` (`EXPO_PUBLIC_*`) eller i GitHub Secrets. De commits aldrig.
- Firebase-, fetch- og AI-kald ligger i `database/` eller `services/`, ikke i skærmene. Styles ligger i `styles/GlobalStyle.js`.
- Ingen tekst i versaler: hverken `textTransform: 'uppercase'`, versaler skrevet direkte i teksten eller bred spærring. Labels og mærker skrives med stort begyndelsesbogstav og skilles ud med vægt, størrelse og farve.
- Logik, der skal testes, skrives som rene funktioner: Jest i appen (`npm test`) og `node:test` i `scraper/`.

## Sproget i appen

`CONTEXT.md` er vores interne, præcise sprog. Brugerne skal have almindeligt dansk:

- Stort bogstav kun først i en sætning, en overskrift eller et mærke. Ikke midt i en sætning, fordi ordet står i ordlisten.
- Så få fagord som muligt. Hvert begreb fra ordlisten har ét fast ord i appen, så vi siger det samme alle steder.
- Tal skrives på dansk: `3,4 km`, `1.234 kr.`, `249 kr. pr. md.` (se `formatDistance`, `formatKr` og `formatPrice` i `data/centerDetail.js`).
- Data i databasen (fx Abonnementstype `Lokal center`) ændres ikke. Den oversættes, når den vises.

| Ordliste (`CONTEXT.md`) | I appen |
| --- | --- |
| Center / Kæde | center / kæde (eller kædens navn, fx "PureGym") |
| Tilbud | abonnement |
| Ærlig årspris | ærlig årspris (forklares med ⓘ) |
| Kvartalspris | de første 3 måneder |
| Abonnementstype `Lokal center` / `Landsdækkende` | lokalt center / landsdækkende |
| Kampagnepris / Standardpris | kampagnepris / normalpris |
| Oprettelsesgebyr / Admingebyr | oprettelse / admingebyr |
| Rabat (fx for Rabatgruppen Studerende) | studierabat, seniorrabat, Ældre Sagen-rabat |
| Rabatprofil | rabatter (overskrift "Rabatter") |
| Makkerpris | makkerpris |
| Binding | binding |
| Ikke oplyst | ikke oplyst |
| Anbefalet | Anbefalet (mærke), ellers "det anbefalede center" / "anbefalingen" |
| Filter | filtre |
| Præference | dine ønsker (overskrift "Dine ønsker") |
| Favorit | favorit / gemt |
| Konto (anonym bruger linkes til e-mail) | opret konto (knap "Opret konto") |
