# Ronnie kalder OpenAI direkte fra appen, med en ugentlig grænse i appen

Spørg Ronnie kalder OpenAI (`gpt-4o-mini`) direkte fra telefonen med en nøgle fra `EXPO_PUBLIC_OPENAI_API_KEY`, og appen tillader højst 30 spørgsmål pr. bruger pr. uge (ISO-uge, dansk tid), talt under `Users/<uid>/ronnieUsage`. Det er en bevidst accepteret risiko: nøglen bygges ind i app-pakken og kan trækkes ud, og grænsen i appen kan omgås af den, der gør det. Den egentlige sikring er en lav forbrugsgrænse på OpenAI-projektet og en nøgle, der kun har adgang til det projekt.

## Overvejede muligheder

- **Server, der holder nøglen** (fx en Firebase Cloud Function med en samlet ugentlig grænse): den rigtige løsning, men kræver Firebase Blaze-planen og en server, projektet ellers ikke har. Fravalgt for nu.

## Konsekvenser

- Grænsen stopper almindelige brugere og fejl, der gentager kald, ikke misbrug af nøglen.
- Før appen deles bredere, skal nøglen udskiftes og kaldet flyttes til en server.
