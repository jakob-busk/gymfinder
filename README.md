# GymFinder
GymFinder er en React Native-app (Expo), der sammenligner tilbud fra fitnesscentre og anbefaler brugeren det abonnement, der passer bedst til deres oplysninger og præferencer. Det "rigtige abonnement" baserer sig på den "ærlige årspris" (hvad man reelt betaler i gennemsnit pr. måned over et år, inkl. kampagne- og studietilbud), ikke bare den reklamerede månedspris.

## Demovideo
https://youtube.com/shorts/1Kq23Akv9TQ?feature=share

## Github link
https://github.com/jakob-busk/gymfinder

## Kør projektet
1. Installer dependencies:
npm install

2. Start expo:
npx expo start

3. Scan QR-koden med Expo Go-appen. Computer og telefon skal være på samme WiFi-netværk.

## Firebase
Appen bruger Firebase Realtime Database til Kæder, Centre og Tilbud og Firebase Authentication til en anonym bruger. Nøglerne ligger aldrig i git.

**Uden opsætning** starter appen med de håndindtastede eksempeldata fra `data/const.js` og uden login. Det samme sker, hvis databasen er tom.

**Opsætning af appen**
1. Kopiér `.env.example` til `.env`, og udfyld værdierne fra Firebase-konsollen (Projektindstillinger → Generelt → web-app). Database-URL'en står øverst på Realtime Database-siden.
2. Slå **Anonymous** til under Authentication → Sign-in method.
3. Genstart Expo (`npx expo start -c`), så de nye `EXPO_PUBLIC_*`-værdier bliver læst.

Ved første opstart oprettes en anonym bruger. Firebase gemmer den i AsyncStorage, så brugeren beholder samme uid efter genstart. Profil viser de første tegn af uid'et.

**Datamodel** (streng-id'er som nøgler, fx `sats-oesterbro`)

| Sti | Indhold |
|---|---|
| `Chains/<chainId>` | Kæde med Rabatter |
| `Centers/<centerId>` | Center: Kæde, adresse, placering, faciliteter (ja/nej/ukendt), maskiner, tilmeldingslink |
| `Offers/<centerId>/<offerId>` | Tilbud i Centret med priser, gebyrer og Binding |
| `Users/<uid>` | Brugerens egne data |
| `Users/<uid>/profile` | Profil: adresse og placering, fødselsdato, Rabatprofil, Nuværende medlemskab, Præferencer og hvornår onboarding blev gennemført |

**Profil uden Firebase.** Profilen gemmes altid også i AsyncStorage. Uden Firebase-nøgler (eller uden forbindelse) bruges den lokale kopi, så appen husker brugeren efter genstart alligevel. Om onboarding er gennemført, caches i AsyncStorage, så den ikke vises igen på telefonen. Oversættelsen af profilen til og fra databasen ligger i `data/userProfile.js`.

Oversættelsen mellem databasen og Matchning ligger i `data/centerData.js`. Databasen gemmer hverken `null` eller tomme lister, så manglende felter læses som "ukendt" (fx Binding og faciliteter).

**Sikkerhedsregler** (`database.rules.json`)
- `Chains`, `Centers` og `Offers` kan læses af alle, men ingen klient kan skrive dem. Kun service-accounten (seed-script og scraper med firebase-admin) kan skrive, fordi admin-SDK'et går uden om reglerne.
- `Users/<uid>` kan kun læses og skrives af en logget ind bruger med netop den uid.
- Alt andet er lukket, fordi Realtime Database nægter adgang, når ingen regel giver den.

Reglerne lægges op ved at indsætte filens indhold under Realtime Database → Regler i konsollen eller med `firebase deploy --only database`.

**Seed af centerdata.** `scraper/seed.mjs` lægger de håndindtastede Kæder, Centre og Tilbud i databasen. Hver Kæde, hvert Center og hvert Centers Tilbud overskrives på sin egen sti i én samlet opdatering, så scriptet kan køres flere gange med samme resultat. Brugerdata røres ikke.
1. Kopiér `scraper/.env.example` til `scraper/.env`, og indsæt service account-JSON'en (Projektindstillinger → Service accounts → Generate new private key) og database-URL'en. Nøglefilen må aldrig committes.
2. Kør:

```
cd scraper
npm install
npm run seed:dry-run   # viser opdateringen uden at skrive
npm run seed           # skriver til databasen
```

## Test
Matchning (`data/matchning.js`: Ærlig årspris, Kvartalspris, Rabatter, Filtre, Anbefalet og sortering), oversættelsen af centerdata til og fra databasen (`data/centerData.js`), brugerprofilen (`data/userProfile.js` og `services/UserProfile.js`: fødselsdato, månedspris, gem/hent med lokal kopi og hvornår onboarding vises), Firebase-konfigurationen og sikkerhedsreglerne testes med Jest via jest-expo. Testene bruger ikke netværk:

npm test

## Skærme
Navigation: første gang vises onboarding. Derefter fire faner i bunden (Find, Spørg Ronnie, Favoritter og Profil). Centerdetalje og Filtre åbnes som stack oven på fanerne, og Om os åbnes fra Profil.

- **Onboarding** (`screens/Onboarding/`, kun første gang): velkomst med Ronnie → adresse (geokodes) eller "Brug min placering" → fødselsdato → Rabatprofil → Nuværende medlemskab (egen månedspris og evt. Kæde, eller "Ingen") → Præferencer → fortsæt anonymt. Adresse og fødselsdato er krævet; resten kan springes over. Afslås adgang til placering, skriver man bare adressen

- **Find**: liste over Centre via Matchning, sorteret efter Ærlig årspris, Kvartalspris, pris høj→lav eller afstand, med det Anbefalede fremhævet. Data hentes fra Firebase, ellers vises håndindtastede eksempeldata. "Se mere" åbner Centerdetalje
- **Spørg Ronnie**: chat med Ronnie (pladsholder med Ronnie indtil videre)
- **Favoritter**: gemte Centre og Prisalarmer (pladsholder)
- **Profil**: ret alt fra onboarding (adresse, fødselsdato, Rabatprofil, Nuværende medlemskab og Præferencer). Ændringer slår straks igennem på Find og gemmes automatisk. Præferencerne er udgangspunktet for Filtre
- **Om os**: kort om GymFinder, åbnes fra Profil
- **Centerdetalje**: det valgte Center (pladsholder)
- **Filtre**: Filtre til Find (pladsholder; Find bruger indtil videre Præferencerne fra Profil)

Fagord som Ærlig årspris, Kvartalspris, Makkerpris, Træn med en makker, Admingebyr, Binding, Ikke oplyst og Spar mere-forslag har en ⓘ, der åbner en forklaring. Alle forklaringer står ét sted, i `data/explanations.js`, og vises af `components/InfoButton.js`. Ronnie-maskotten ligger i `assets/ronnie.png` med gennemsigtig baggrund.

## Hvem har lavet hvad
Hver skærmfil har en `// Ansvarlig: <navn>`-kommentar øverst.

| Ansvarlig | Skærme og dele |
|---|---|
| Jakob | Onboarding (`screens/Onboarding/`), Profil (`screens/ProfileScreen.js`), Om os (`screens/AboutScreen.js`), scraper og nat-job |
| Christian | Find (`screens/FindScreen.js`), Filtre (`screens/FiltersScreen.js`), Centerdetalje (`screens/CenterDetailScreen.js`) |
| Bastian | Spørg Ronnie (`screens/AskRonnieScreen.js`), Favoritter/Alarmer (`screens/FavoritesScreen.js`) |

## Teknologi
Som nævnt i rapport, har jeg brugt Matt Pocock's **/grill-with-docs** skill i samarbejde med Claude Code til at planlægge app'ens opsætning (https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md). Brugen og det endelige beslutningstræ er dokumenteret i rapporten.
