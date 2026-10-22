# Stikprøve: LOOP

Dato: 2026-10-22  
Resultat: **STEMMER**

Tre tilfældige Centre er hentet fra loopfitness.dk. Kolonnen "Scraper" er det, nat-jobbet
skriver (læst fra centerlistens `var locations`), og "Hjemmeside" er det, en besøgende ser:
adressen og åbningstiden på centersiden og teksterne på centersidens priskort (som siden selv
henter fra LOOPs admin-ajax). Ældre Sagen-rabatten tjekkes mod Ældre Sagens egen side.
LOOP opkræver pr. 30 dage; kampagnen "100 kr. resten af året" fordeles af scraperen på de
hele 30-dages-perioder til slutdatoen, så "kampagne i alt" sammenligner hele beløbet.
Genereres med `npm run verify:loop` i `scraper/`.

## Live-kørsel (tør, intet skrevet)

- Status: OK
- Centre fundet: 137
- Gyldige Tilbud efter sanity-reglerne: 142
- Fejl: 0
- Advarsler: 0

## LOOP Østerbro (loop-219)

https://loopfitness.dk/centre/loop-fitness-oesterbro/

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Adresse | Teglværksgade 37, 2100 København Ø | Teglværksgade 37, 2100 København Ø | ja |
| Døgnåbent | nej | nej (Åbent alle dage fra 05 – 22) | ja |
| Voksen: Standardpris (kr pr. 30 dage) | 289 | 289 | ja |
| Voksen: betaling pr. antal dage | 30 | 30 | ja |
| Voksen: Admingebyr (kr) | 10 | 10 | ja |
| Voksen: kampagne i alt (kr) | 100 | 100 | ja |
| Voksen: kampagnen slutter | 2026-12-31 | 2026-12-31 | ja |
| Voksen: minimumspris (kr) | 399 | 399 | ja |
| Familie (Træn med en makker): pris pr. husstand (kr pr. 30 dage) | 589 | 589 | ja |

## LOOP Odense SØ (loop-124)

https://loopfitness.dk/centre/loop-fitness-odense-soe/

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Adresse | Rosengårdcentret, Ørbækvej 75, 5220 Odense SØ | Rosengårdcentret, Ørbækvej 75, 5220 Odense SØ | ja |
| Døgnåbent | nej | nej (Åbent alle dage fra 05 – 23) | ja |
| Voksen: Standardpris (kr pr. 30 dage) | 289 | 289 | ja |
| Voksen: betaling pr. antal dage | 30 | 30 | ja |
| Voksen: Admingebyr (kr) | 10 | 10 | ja |
| Voksen: kampagne i alt (kr) | 100 | 100 | ja |
| Voksen: kampagnen slutter | 2026-12-31 | 2026-12-31 | ja |
| Voksen: minimumspris (kr) | 399 | 399 | ja |
| Familie (Træn med en makker): pris pr. husstand (kr pr. 30 dage) | 589 | 589 | ja |

## LOOP Horsens (loop-136)

https://loopfitness.dk/centre/loop-fitness-horsens/

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Adresse | Høegh Guldbergsgade 36, 8700 Horsens | Høegh Guldbergsgade 36, 8700 Horsens | ja |
| Døgnåbent | nej | nej (Åbent alle dage fra 05 – 24) | ja |
| Voksen: Standardpris (kr pr. 30 dage) | 289 | 289 | ja |
| Voksen: betaling pr. antal dage | 30 | 30 | ja |
| Voksen: Admingebyr (kr) | 10 | 10 | ja |
| Voksen: kampagne i alt (kr) | 100 | 100 | ja |
| Voksen: kampagnen slutter | 2026-12-31 | 2026-12-31 | ja |
| Voksen: minimumspris (kr) | 399 | 399 | ja |
| Familie (Træn med en makker): pris pr. husstand (kr pr. 30 dage) | 589 | 589 | ja |

## Ældre Sagen-rabat (Kæden)

https://www.aeldresagen.dk/tilbud-og-rabatter/samarbejdspartnere/motion-og-fitness/loop-fitness/offers/rabat-paa-fitness-loop-fitness

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Rabat (%) | 15 | 15 | ja |
| Oprettelsesgebyr med Rabat (kr) | 199 | 199 | ja |
