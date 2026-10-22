# Stikprøve: SATS

Dato: 2026-10-22  
Resultat: **STEMMER**

Tre tilfældige Centre er hentet fra hjemmesiden. Kolonnen "Scraper" er det, scraperen læser
(sidernes data-props), og "Hjemmeside" er det, en besøgende ser: priserne på de synlige
priskort og adresselinjen øverst på centersiden. Genereres med
`npm run verify` i `scraper/`.

## SATS FRB - ABC (sats-411)

https://www.sats.dk/traeningscenter/kobenhavn/frb-abc

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Adresse | Frederiksberg Allé 98, 1820 Frederiksberg C | Frederiksberg Allé 98, 1820, Frederiksberg C | ja |
| Basic under 30 (kr/md) | 499 | 499 | ja |
| Flexible under 30 (kr/md) | 599 | 599 | ja |
| Premium under 30 (kr/md) | 699 | 699 | ja |

## SATS Nærum (sats-425)

https://www.sats.dk/traeningscenter/storkobenhavn/naerum

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Adresse | Rundforbivej 186-188, 2850 Nærum | Rundforbivej 186-188, 2850, Nærum | ja |
| Basic under 30 (kr/md) | 449 | 449 | ja |
| Flexible under 30 (kr/md) | 599 | 599 | ja |
| Premium under 30 (kr/md) | 699 | 699 | ja |

## SATS Vesterport (sats-413)

https://www.sats.dk/traeningscenter/kobenhavn/kbh-vesterport-tidligere-sats-royal

| Felt | Scraper | Hjemmeside | Stemmer |
|---|---|---|---|
| Adresse | Ved Vesterport 1, 1612 København V | Ved Vesterport 1, 1612, København V | ja |
| Basic under 30 (kr/md) | 549 | 549 | ja |
| Flexible under 30 (kr/md) | 599 | 599 | ja |
| Premium under 30 (kr/md) | 699 | 699 | ja |
