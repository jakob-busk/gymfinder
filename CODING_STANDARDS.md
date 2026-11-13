# Kodestandard

- Brug ordene fra `CONTEXT.md` i kommentarer og dokumentation. Kommentarer og UI-tekst skrives på dansk, mens navne i koden er på engelsk.
- UI-tekst følger tabellen "Sproget i appen" nedenfor, ikke ordlistens stavemåde.
- Hver skærm starter med `// Ansvarlig: <navn>`.
- Nøgler og hemmeligheder ligger kun i `.env` (`EXPO_PUBLIC_*`) eller i GitHub Secrets. De commits aldrig.
- Firebase-, fetch- og AI-kald ligger i `database/` eller `services/`, ikke i skærmene. Styles ligger i `styles/GlobalStyle.js`.
- Logik, der skal testes, skrives som rene funktioner: Jest i appen (`npm test`) og `node:test` i `scraper/`.

## Sproget i appen

`CONTEXT.md` er vores interne, præcise sprog. Brugerne skal have almindeligt dansk:

- Stort bogstav kun først i en sætning, en overskrift eller et mærke. Ikke midt i en sætning, fordi ordet står i ordlisten.
- Så få fagord som muligt. Hvert begreb fra ordlisten har ét fast ord i appen, så vi siger det samme alle steder.
- Tal skrives på dansk: `3,4 km`, `1.234 kr`.
- Data i databasen (fx Abonnementstype `Lokal center`) ændres ikke. Den oversættes, når den vises.

| Ordliste (`CONTEXT.md`) | I appen |
| --- | --- |
| Center / Kæde | center / kæde (eller kædens navn, fx "PureGym") |
| Tilbud | abonnement |
| Ærlig årspris | ærlig årspris (forklares med ⓘ) |
| Kvartalspris | de første 3 måneder |
| Abonnementstype `Lokal center` / `Landsdækkende` | ét center / alle kædens centre |
| Kampagnepris / Standardpris | kampagnepris / normalpris |
| Oprettelsesgebyr / Admingebyr | oprettelse / admingebyr |
| Rabat (fx for Rabatgruppen Studerende) | studierabat, seniorrabat, Ældre Sagen-rabat |
| Makkerpris | makkerpris |
| Binding | binding |
| Ikke oplyst | ikke oplyst |
| Anbefalet | Anbefalet (mærke) |
| Filter / Præference | filtre / dine ønsker |
| Favorit | favorit / gemt |
