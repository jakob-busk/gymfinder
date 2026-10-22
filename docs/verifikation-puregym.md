# Stikprøve: PureGym

Dato: 2026-10-22  
Resultat: **STEMMER**

Tre tilfældige Centre er hentet fra puregym.dk med samme kald som nat-jobbet (formularen og
én POST pr. Aldersgruppe) plus centersiden. Kolonnen "Scraper" er det, scraperen skriver
(priser fra formularens data og det med småt, adresse fra /find-center), og "Hjemmeside" er
det, en besøgende ser: de synlige priskort (normalpris og intropris) og centersidens
adresse, navn og koordinater (JSON-LD). Kampagneprisen er den højeste af de to
Aldersgruppers intropris, fordi et Tilbud kun har én Kampagnepris. Genereres med
`npm run verify:puregym` i `scraper/`.

Oprettelsesgebyr (fra /priser): 99 kr. Admingebyr ved kortbetaling: 0 kr/md.

## PureGym Næstved, Sct. Jørgens Park (puregym-279)

https://www.puregym.dk/find-center/sct-joergenspark-naestved

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Adresse | Sct. Jørgens Park 92, 4700 Næstved | Sct. Jørgens Park 92, 4700 Næstved | ja |
| Navn | PureGym Næstved, Sct. Jørgens Park | Næstved, Sct. Jørgens Park | ja |
| Koordinater | 55.21679, 11.75444 | 55.21679, 11.75444 | ja |
| Unlimited under 30 (kr/md) | 429 | 429 | ja |
| Unlimited 30+ (kr/md) | 479 | 479 | ja |
| Unlimited Kampagnepris (højeste af de to) | 359.25 | 359.25 | ja |
| Plus under 30 (kr/md) | 319 | 319 | ja |
| Plus 30+ (kr/md) | 359 | 359 | ja |
| Plus Kampagnepris (højeste af de to) | 269.25 | 269.25 | ja |
| Core under 30 (kr/md) | 269 | 269 | ja |
| Core 30+ (kr/md) | 299 | 299 | ja |
| Core og Hold 30+ (findes kun for 30+, springes over) | – | 349 | ja |
| Normalpris fra (find center) | 269 | 269 | ja |

## PureGym Odense SV., Bondovej (puregym-178)

https://www.puregym.dk/find-center/odense-sv-bondovej

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Adresse | Bondovej 12, 5250 Odense SV | Bondovej 12, 5250 Odense SV | ja |
| Navn | PureGym Odense SV., Bondovej | Odense SV., Bondovej | ja |
| Koordinater | 55.36260, 10.35065 | 55.36260, 10.35065 | ja |
| Unlimited under 30 (kr/md) | 429 | 429 | ja |
| Unlimited 30+ (kr/md) | 479 | 479 | ja |
| Unlimited Kampagnepris (højeste af de to) | 359.25 | 359.25 | ja |
| Plus under 30 (kr/md) | 329 | 329 | ja |
| Plus 30+ (kr/md) | 379 | 379 | ja |
| Plus Kampagnepris (højeste af de to) | 284.25 | 284.25 | ja |
| Core under 30 (kr/md) | 279 | 279 | ja |
| Core 30+ (kr/md) | 319 | 319 | ja |
| Core og Hold 30+ (findes kun for 30+, springes over) | – | 369 | ja |
| Normalpris fra (find center) | 279 | 279 | ja |

## PureGym Søborg, Telefonvej (puregym-176)

https://www.puregym.dk/find-center/soeborg-telefonvej

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Adresse | Telefonvej 8D, 2860 Søborg | Telefonvej 8D, 2860 Søborg | ja |
| Navn | PureGym Søborg, Telefonvej | Søborg, Telefonvej | ja |
| Koordinater | 55.73961, 12.49329 | 55.73961, 12.49329 | ja |
| Unlimited under 30 (kr/md) | 429 | 429 | ja |
| Unlimited 30+ (kr/md) | 479 | 479 | ja |
| Unlimited Kampagnepris (højeste af de to) | 359.25 | 359.25 | ja |
| Plus under 30 (kr/md) | 349 | 349 | ja |
| Plus 30+ (kr/md) | 399 | 399 | ja |
| Plus Kampagnepris (højeste af de to) | 299.25 | 299.25 | ja |
| Core under 30 (kr/md) | 269 | 269 | ja |
| Core 30+ (kr/md) | 299 | 299 | ja |
| Core og Hold under 30 (kr/md) | 319 | 319 | ja |
| Core og Hold 30+ (kr/md) | 349 | 349 | ja |
| Normalpris fra (find center) | 269 | 269 | ja |
