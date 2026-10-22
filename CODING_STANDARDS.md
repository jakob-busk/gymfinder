# Kodestandard

- Brug ordene fra `CONTEXT.md` i UI-tekst og kommentarer. UI-tekst og kommentarer skrives på dansk, mens navne i koden er på engelsk.
- Hver skærm starter med `// Ansvarlig: <navn>`.
- Nøgler og hemmeligheder ligger kun i `.env` (`EXPO_PUBLIC_*`) eller i GitHub Secrets. De commits aldrig.
- Firebase-, fetch- og AI-kald ligger i `database/` eller `services/`, ikke i skærmene. Styles ligger i `styles/GlobalStyle.js`.
- Logik, der skal testes, skrives som rene funktioner: Jest i appen (`npm test`) og `node:test` i `scraper/`.
