# Natlig scraper på GitHub Actions, uden AI

Priser og Centre hentes af en almindelig Node-scraper med en parser pr. Kæde, der kører hver nat i GitHub Actions og skriver til Realtime Database med en service account. Kravet var, at data skulle være aktuelle uden at nogen gør noget, og at det skulle køre gratis og uden AI eller Claude. Derfor ingen LLM-udtræk af priser og ingen betalt server: GitHub Actions er gratis, og parserne er deterministiske og kan testes mod gemte svar.

## Konsekvenser

- Hver Kæde kræver sin egen parser, og den går i stykker, når Kæden ændrer sin side. Sanity-reglerne (fx højst ±50 % prisændring på én nat, en Kæde springes over ved 0 Centre eller over 20 % fejl) sørger for, at en ødelagt parser beholder de gamle data i stedet for at skrive forkerte.
- Cron kører kun fra default-branchen, og GitHub slår den fra efter 60 dage uden aktivitet i repoet.
- Klienter kan ikke skrive centerdata (`database.rules.json`); kun scraperen kan, fordi admin-SDK'et omgår reglerne.
