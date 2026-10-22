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
Matchning (`data/matchning.js`: Ærlig årspris, Kvartalspris, Rabatter, Filtre, Anbefalet og sortering), oversættelsen af centerdata til og fra databasen (`data/centerData.js`), Firebase-konfigurationen og sikkerhedsreglerne testes med Jest via jest-expo. Testene bruger ikke netværk:

npm test

## Skærme
- **Dashboard**: liste over Centre via Matchning, sorteret efter Ærlig årspris, Kvartalspris, pris høj→lav eller afstand, med det Anbefalede fremhævet. Data hentes fra Firebase, ellers vises håndindtastede eksempeldata
- **Profil**: brugerens oplysninger, Rabatprofil og redigerbare Præferencer (maskiner, faciliteter, binding, maks. afstand)
- **Om os**: kort om GymFinder

## Teknologi
Som nævnt i rapport, har jeg brugt Matt Pocock's **/grill-with-docs** skill i samarbejde med Claude Code til at planlægge app'ens opsætning (https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md). Brugen og det endelige beslutningstræ er dokumenteret i rapporten.
