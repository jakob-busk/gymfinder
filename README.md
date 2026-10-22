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
2. Slå **Anonymous** og **Email/Password** til under Authentication → Sign-in method.
3. Genstart Expo (`npx expo start -c`), så de nye `EXPO_PUBLIC_*`-værdier bliver læst.

Ved første opstart oprettes en anonym bruger. Firebase gemmer den i AsyncStorage, så brugeren beholder samme uid efter genstart. Under Konto på Profil kan brugeren gemme sin profil, logge ind eller logge ud.

**Datamodel** (streng-id'er som nøgler, fx `sats-oesterbro`)

| Sti | Indhold |
|---|---|
| `Chains/<chainId>` | Kæde med Rabatter |
| `Centers/<centerId>` | Center: Kæde, adresse, placering, faciliteter (ja/nej/ukendt), maskiner, tilmeldingslink |
| `Offers/<centerId>/<offerId>` | Tilbud i Centret med priser, gebyrer og Binding |
| `PriceHistory/<centerId>/<offerId>/<dato>` | Prishistorik pr. Tilbud pr. dag (kun scraperen læser og skriver) |
| `Users/<uid>` | Brugerens egne data |
| `Users/<uid>/profile` | Profil: adresse og placering, fødselsdato, Rabatprofil, Nuværende medlemskab, Præferencer og hvornår onboarding blev gennemført |
| `Users/<uid>/favorites/<centerId>` | Favorit: hvornår den blev gemt, Ærlig årspris da brugeren sidst fik den at vide (grundlag for prisfald) og evt. Prisalarm med tærskel |

**Profil uden Firebase.** Profilen gemmes altid også i AsyncStorage. Uden Firebase-nøgler (eller uden forbindelse) bruges den lokale kopi, så appen husker brugeren efter genstart alligevel. Om onboarding er gennemført, caches i AsyncStorage, så den ikke vises igen på telefonen. Oversættelsen af profilen til og fra databasen ligger i `data/userProfile.js`.

**Favoritter.** Hver Favorit gemmes på sin egen sti under brugerens uid, så Prisalarmer og nat-jobbet kan ændre én Favorit uden at røre de andre. Den pris, der følges, er den laveste Ærlig årspris blandt Centrets Tilbud for brugeren (`favoritePrice` i `data/favorites.js`, som også nat-jobbet kan bruge). Ligesom profilen gemmes Favoritterne også i AsyncStorage, så de huskes uden Firebase og offline. Favoritter gemt uden login lægges op på brugeren, når der kommer en uid, og log ud fjerner dem fra telefonen (`services/Favorites.js`).

**Konto.** Sidste onboarding-trin og Profil tilbyder "Gem din profil" (navn, e-mail og adgangskode) eller at fortsætte anonymt. Gem din profil linker den anonyme bruger til e-mail og adgangskode (`linkWithCredential`), så uid'et er det samme, og profil, Favoritter og Prisalarmer under `Users/<uid>` følger med uden at blive kopieret. Med "Jeg har allerede en konto" (velkomsten eller Profil) logger man ind på en ny telefon. Så skifter uid'et til kontoens, profilen hentes, og onboarding springes over, hvis den er gennemført på kontoen. Log ud (Profil) fjerner profilen og onboarding-status fra telefonen og starter en ny anonym bruger. Data på kontoen bliver i databasen. Fejl som forkert adgangskode, e-mail i brug og svag adgangskode vises på dansk (`data/account.js`). Login-logikken ligger i `services/Auth.js`. Uden Firebase skjules kontodelen.

Oversættelsen mellem databasen og Matchning ligger i `data/centerData.js`. Databasen gemmer hverken `null` eller tomme lister, så manglende felter læses som "ukendt" (fx Binding og faciliteter).

**Sikkerhedsregler** (`database.rules.json`)
- `Chains`, `Centers` og `Offers` kan læses af alle, men ingen klient kan skrive dem. Kun service-accounten (seed-script og scraper med firebase-admin) kan skrive, fordi admin-SDK'et går uden om reglerne.
- `Users/<uid>` kan kun læses og skrives af en logget ind bruger med netop den uid.
- Alt andet er lukket, fordi Realtime Database nægter adgang, når ingen regel giver den.

Reglerne lægges op ved at indsætte filens indhold under Realtime Database → Regler i konsollen eller med `firebase deploy --only database`.

**Seed af centerdata.** `scraper/seed.mjs` lægger de håndindtastede Kæder, Centre og Tilbud i databasen. Kæder, som den natlige scraper har overtaget (i dag SATS), springes over. Hver Kæde, hvert Center og hvert Centers Tilbud overskrives på sin egen sti i én samlet opdatering, så scriptet kan køres flere gange med samme resultat. Brugerdata røres ikke.
1. Kopiér `scraper/.env.example` til `scraper/.env`, og indsæt service account-JSON'en (Projektindstillinger → Service accounts → Generate new private key) og database-URL'en. Nøglefilen må aldrig committes.
2. Kør:

```
cd scraper
npm install
npm run seed:dry-run   # viser opdateringen uden at skrive
npm run seed           # skriver til databasen
```

## Test
Matchning (`data/matchning.js`: Ærlig årspris, Kvartalspris, Rabatter, Filtre, Anbefalet og sortering), oversættelsen af centerdata til og fra databasen (`data/centerData.js`), brugerprofilen (`data/userProfile.js` og `services/UserProfile.js`: fødselsdato, månedspris, gem/hent med lokal kopi og hvornår onboarding vises), konto (`data/account.js` og `services/Auth.js`: validering, danske fejltekster, opgradering med samme uid, log ind og log ud), Firebase-konfigurationen og sikkerhedsreglerne testes med Jest via jest-expo. Testene bruger ikke netværk:

npm test

Visningslogikken på Find (kortudsnit, nøgleord på pins og forslag til at løsne Filtre i `data/findView.js`) testes også med Jest. Det samme gør Filtre og sortering (`data/filterSettings.js` og `services/FilterSettings.js`: udgangspunkt i Præferencer, huskes efter genstart og Nulstil) og Centerdetaljens visningslogik i `data/centerDetail.js` (månedsudregning mod Matchnings Ærlig årspris, 30-års-advarsel, gebyrer, Makkerpris og tilmeldingslink). Favoritter testes i `data/favorites.js` (pris der følges, rækkefølge og formen i databasen) og `services/Favorites.js` (gemt under uid, følger kontoen, lokal kopi uden Firebase, log ud).

## Natlig scraper
**Ansvarlig:** Jakob

`scraper/` er et selvstændigt Node-projekt (Node 22, ingen Expo og ingen AI), der henter rigtige Centre og Tilbud fra kædernes hjemmesider og skriver dem til Realtime Database med firebase-admin. I dag scrapes SATS; de øvrige Kæder bruger håndindtastede data, indtil deres parser har bestået alle tre testlag.

**Hvornår.** GitHub Actions (`.github/workflows/scraper.yml`) kører hver nat kl. 02:17 UTC (03:17 dansk vintertid) og kan startes manuelt under Actions → Natlig scraper → Run workflow, evt. som tør kørsel. Testene køres før hver kørsel. Rapporten står i jobbets oversigt og som artefakt.

**Secrets** (Settings → Secrets and variables → Actions):
- `FIREBASE_SERVICE_ACCOUNT`: hele service account-JSON'en på én linje
- `FIREBASE_DATABASE_URL`: database-URL'en

**Høflighed.** Ærlig User-Agent, ét kald ad gangen og 2,5 sekunders pause mellem kaldene. SATS koster ca. 32 kald pr. nat: centerlisten, én side pr. Center og tre checkout-sider til gebyr og kampagne.

**Regler.**
- Et Tilbud skrives kun, hvis prisen ligger mellem 50 og 2.000 kr/md, Centrets koordinater ligger i Danmark, de påkrævede felter er udfyldt, Kampagneprisen er lavere end Standardprisen, og Standardprisen højst har ændret sig ±50 % siden sidste nat. Ellers beholdes de gamle data, og fejlen logges.
- Giver en Kæde 0 Centre, eller fejler mere end 20 %, springes hele Kæden over: de gamle data beholdes, der laves ingen prisændringer (og dermed ingen alarmer), og jobbet bliver rødt.
- Et Tilbud eller Center, der forsvinder fra hjemmesiden, beholdes med sit "sidst set" (`lastSeen`) og tæller `missingNights` op. Efter 3 nætter fjernes det.
- Alt skrives i én samlet opdatering, inkl. prishistorik pr. Tilbud pr. dag.

**Kør lokalt** (fra `scraper/`, nøgler i `scraper/.env` som ved seed):

```
npm install
npm test                                  # parser, sanity-regler og nat-job (ingen netværk)
npm run scrape:dry-run -- --limit 3       # live-kørsel uden skrivning, kun 3 Centre
npm run scrape:dry-run -- --report r.md   # hele live-kørslen med rapport, intet skrives
npm run verify                            # stikprøve: 3 tilfældige Centre mod hjemmesiden
npm run scrape                            # skriver til databasen
```

**Tre testlag.** En Kæde er først "færdig", når alle tre er grønne:
1. `npm test`: SATS-parseren mod gemte, trimmede svar fra sats.dk (`scraper/fixtures/sats/`) med præcist forventede Centre og Tilbud, sanity-reglerne og nat-jobbet end-to-end med en falsk database (normal kørsel, sanity-fejl, kæde-fejl, forsvundet 1/2/3 nætter).
2. Live-kørsel uden skrivning, der laver en rapport.
3. Stikprøve-bevis i `docs/verifikation-sats.md`: tre tilfældige Centre, hvor scraperens tal sammenlignes med de priser og den adresse, en besøgende ser på siden. Køres igen, hver gang parseren ændres.

## Skærme
Navigation: første gang vises onboarding. Derefter fire faner i bunden (Find, Spørg Ronnie, Favoritter og Profil). Centerdetalje og Filtre åbnes som stack oven på fanerne, og Om os åbnes fra Profil.

- **Onboarding** (`screens/Onboarding/`, kun første gang): velkomst med Ronnie → adresse (geokodes) eller "Brug min placering" → fødselsdato → Rabatprofil → Nuværende medlemskab (egen månedspris og evt. Kæde, eller "Ingen") → Præferencer → gem din profil (konto) eller fortsæt anonymt. Fra velkomsten kan man logge ind med en eksisterende konto i stedet. Adresse og fødselsdato er krævet; resten kan springes over. Afslås adgang til placering, skriver man bare adressen

- **Find**: kort med din egen pin (blå) og en pin pr. Center, og en scrollbar liste over præcis de samme Centre nedenunder. Begge viser resultatet fra Matchning, så kun Centre inden for maks. afstand og dine Filtre vises, og sorteringen (Ærlig årspris, Kvartalspris, pris høj→lav eller afstand) gælder listen. Det Anbefalede Center har en orange pin og et ANBEFALET-mærke. Tryk på en pin viser Kæde, Ærlig årspris, Distance, nøgleord (fx sauna) og "Se mere", der åbner Centerdetalje. Matcher intet, viser Ronnie forslag til at løsne Filtrene. Data hentes fra Firebase, ellers vises håndindtastede eksempeldata. Kortet (`react-native-maps`) kræver ingen API-nøgle i Expo Go
- **Spørg Ronnie**: chat med Ronnie (pladsholder med Ronnie indtil videre)
- **Favoritter**: ♥ på et Center i listen på Find eller på Centerdetalje gør det til Favorit (tryk igen for at fjerne). Favoritter-skærmen viser hver Favorit med den aktuelle laveste Ærlig årspris blandt de Tilbud, du kan bruge dér, og hvor meget den er faldet eller steget, siden du gemte den. Tryk åbner Centerdetalje, og Fjern sletter Favoritten. Favoritterne følger kontoen og huskes efter genstart. Prisalarmer kommer senere
- **Profil**: ret alt fra onboarding (adresse, fødselsdato, Rabatprofil, Nuværende medlemskab og Præferencer). Ændringer slår straks igennem på Find og gemmes automatisk. Præferencerne er udgangspunktet for Filtre. Under Konto kan man gemme sin profil, logge ind eller logge ud
- **Om os**: kort om GymFinder, åbnes fra Profil
- **Log ind** (`screens/LoginScreen.js`): log ind med e-mail og adgangskode, fx på en ny telefon. Åbnes fra velkomsten og fra Profil
- **Centerdetalje**: adresse, Distance, Kæde og faciliteter (Ja/Nej/Ikke oplyst) og alle Centrets Tilbud, også dem dine Filtre ville skjule. Hvert Tilbud viser din Ærlig årspris og Kvartalspris, hvilken mulighed der er billigst for dig (Kampagnepris, en Rabat eller Makkerpris), Oprettelsesgebyr, Admingebyr, Binding og prisudregningen måned for måned, der giver præcis den samme Ærlig årspris som Matchning. Fylder du 30 inden for et år, og stiger prisen derfor, står det med måned. Spar mere-forslag vises, når de kan betale sig, og brugere i Træn med en makker ser Makkerpris pr. person og kædens krav. "Gå til tilmelding" åbner kædens side med et henvisningslink (`utm_source=gymfinder`)
- **Filtre**: sortering (Ærlig årspris, Kvartalspris, pris høj→lav, afstand) og Filtre til Find: sauna, holdtræning, døgnåbent, adgang til flere centre, ingen Binding, maskiner og maks. afstand. Udgangspunktet er dine Præferencer. Centre, der med sikkerhed ikke opfylder et Filter, skjules; er det ukendt, vises Centret med "Ikke oplyst" (ⓘ) i listen og på pinnen. Filtre og sortering gemmes på telefonen og huskes efter genstart, og Nulstil går tilbage til Præferencerne

Fagord som Ærlig årspris, Kvartalspris, Makkerpris, Træn med en makker, Admingebyr, Binding, Ikke oplyst og Spar mere-forslag har en ⓘ, der åbner en forklaring. Alle forklaringer står ét sted, i `data/explanations.js`, og vises af `components/InfoButton.js`. Ronnie-maskotten ligger i `assets/ronnie.png` med gennemsigtig baggrund.

## Hvem har lavet hvad
Hver skærmfil har en `// Ansvarlig: <navn>`-kommentar øverst.

| Ansvarlig | Skærme og dele |
|---|---|
| Jakob | Onboarding (`screens/Onboarding/`), Profil (`screens/ProfileScreen.js`), Om os (`screens/AboutScreen.js`), Log ind (`screens/LoginScreen.js`), scraper og nat-job |
| Christian | Find (`screens/FindScreen.js`), Filtre (`screens/FiltersScreen.js`), Centerdetalje (`screens/CenterDetailScreen.js`) |
| Bastian | Spørg Ronnie (`screens/AskRonnieScreen.js`), Favoritter/Alarmer (`screens/FavoritesScreen.js`) |

## Teknologi
Som nævnt i rapport, har jeg brugt Matt Pocock's **/grill-with-docs** skill i samarbejde med Claude Code til at planlægge app'ens opsætning (https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md). Brugen og det endelige beslutningstræ er dokumenteret i rapporten.
