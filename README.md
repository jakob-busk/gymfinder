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
| `Users/<uid>/currentMembershipAlert` | Prisalarm på Nuværende medlemskab: tærskel, hvornår den blev slået til, og den laveste Ærlig årspris brugeren har fået besked om |
| `Users/<uid>/pushToken` | Telefonens Expo push-token til Prisalarmer |

**Profil uden Firebase.** Profilen gemmes altid også i AsyncStorage. Uden Firebase-nøgler (eller uden forbindelse) bruges den lokale kopi, så appen husker brugeren efter genstart alligevel. Om onboarding er gennemført, caches i AsyncStorage, så den ikke vises igen på telefonen. Oversættelsen af profilen til og fra databasen ligger i `data/userProfile.js`.

**Favoritter.** Hver Favorit gemmes på sin egen sti under brugerens uid, så Prisalarmer og nat-jobbet kan ændre én Favorit uden at røre de andre. Den pris, der følges, er den laveste Ærlig årspris blandt Centrets Tilbud for brugeren (`favoritePrice` i `data/favorites.js`, som også nat-jobbet kan bruge). Ligesom profilen gemmes Favoritterne også i AsyncStorage, så de huskes uden Firebase og offline. Favoritter gemt uden login lægges op på brugeren, når der kommer en uid, og log ud fjerner dem fra telefonen (`services/Favorites.js`).

**Konto.** Sidste onboarding-trin og Profil tilbyder "Gem din profil" (navn, e-mail og adgangskode) eller at fortsætte anonymt. Gem din profil linker den anonyme bruger til e-mail og adgangskode (`linkWithCredential`), så uid'et er det samme, og profil, Favoritter og Prisalarmer under `Users/<uid>` følger med uden at blive kopieret. Med "Jeg har allerede en konto" (velkomsten eller Profil) logger man ind på en ny telefon. Så skifter uid'et til kontoens, profilen hentes, og onboarding springes over, hvis den er gennemført på kontoen. Log ud (Profil) fjerner profilen og onboarding-status fra telefonen og starter en ny anonym bruger. Data på kontoen bliver i databasen. Fejl som forkert adgangskode, e-mail i brug og svag adgangskode vises på dansk (`data/account.js`). Login-logikken ligger i `services/Auth.js`. Uden Firebase skjules kontodelen.

Oversættelsen mellem databasen og Matchning ligger i `data/centerData.js`. Databasen gemmer hverken `null` eller tomme lister, så manglende felter læses som "ukendt" (fx Binding og faciliteter).

**Sikkerhedsregler** (`database.rules.json`)
- `Chains`, `Centers` og `Offers` kan læses af alle, men ingen klient kan skrive dem. Kun service-accounten (seed-script og scraper med firebase-admin) kan skrive, fordi admin-SDK'et går uden om reglerne.
- `Users/<uid>` kan kun læses og skrives af en logget ind bruger med netop den uid.
- Alt andet er lukket, fordi Realtime Database nægter adgang, når ingen regel giver den.

Reglerne lægges op ved at indsætte filens indhold under Realtime Database → Regler i konsollen eller med `firebase deploy --only database`.

**Seed af centerdata.** `scraper/seed.mjs` lægger de håndindtastede Kæder, Centre og Tilbud i databasen. Kæder, som den natlige scraper har overtaget (i dag SATS, LOOP, PureGym og Fitness X), springes over. Hver Kæde, hvert Center og hvert Centers Tilbud overskrives på sin egen sti i én samlet opdatering, så scriptet kan køres flere gange med samme resultat. Brugerdata røres ikke.
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

Visningslogikken på Find (kortudsnit, nøgleord på pins og forslag til at løsne Filtre i `data/findView.js`) testes også med Jest. Det samme gør Filtre og sortering (`data/filterSettings.js` og `services/FilterSettings.js`: udgangspunkt i Præferencer, huskes efter genstart og Nulstil) og Centerdetaljens visningslogik i `data/centerDetail.js` (månedsudregning mod Matchnings Ærlig årspris, 30-års-advarsel, gebyrer, Makkerpris og tilmeldingslink). Favoritter testes i `data/favorites.js` (pris der følges, rækkefølge og formen i databasen) og `services/Favorites.js` (gemt under uid, følger kontoen, lokal kopi uden Firebase, log ud). Prisalarmer testes i `data/priceAlerts.js` (tærskel, fald under/over tærsklen, uden tærskel, Kampagnepris, Nuværende medlemskab inden for maks. afstand, ingen gentagne beskeder og beskedens tekst) og `services/PriceAlerts.js` (alarm og push-token under uid, lokal kopi uden Firebase, log ud). Selve notifikationerne testes manuelt på en telefon.

Spørg Ronnie testes uden netværk og uden nøgle: hvilke Centre Ronnie kender, system-prompten med personlig Ærlig årspris, at hele samtalen sendes med, læsning af svaret `{ tekst, centerIds }` og fejltekster (`data/ronnie.js`, `data/ronniePrompt.js`), opslag af Centre andre steder med en falsk geokoder (`data/ronnieLookup.js`: nærmeste Centre ved stedet, ukendt sted, uden for Danmark, fejlet opslag), og kaldet med en falsk `fetch` (`services/Ronnie.js`, også værktøjskald, opfølgning efter et opslag og højst 2 opslagsrunder). Selve samtalen med Ronnie testes manuelt.

## Spørg Ronnie
**Ansvarlig:** Bastian

Ronnie kalder OpenAI (`gpt-4o-mini`) direkte fra appen (`services/Ronnie.js`).

**Opsætning.** Opret en API-nøgle på platform.openai.com, og sæt den i `.env` som `EXPO_PUBLIC_OPENAI_API_KEY` (se `.env.example`). Genstart Expo med `npx expo start -c`. Nøglen ligger aldrig i git. Uden nøgle viser Spørg Ronnie en besked i stedet for chatten, og resten af appen virker som normalt.

**Forbrugsgrænse.** `EXPO_PUBLIC_*`-værdier bliver bygget ind i appen, så nøglen kan findes af den, der har appen. Giv derfor OpenAI-projektet en lav månedlig forbrugsgrænse (Settings → Limits, fx 5 USD), og brug en nøgle, der kun har adgang til det projekt. Når grænsen er nået, siger Ronnie, at han har fået for mange spørgsmål.

**Hvad Ronnie ved.** System-prompten (`data/ronniePrompt.js`) indeholder de 20 nærmeste Centre, der matcher dine Filtre, med din personlige Ærlig årspris for hvert Tilbud fra Matchning, den billigste mulighed for dig (fx Kampagnepris eller Studierabat), Oprettelsesgebyr, Admingebyr, Binding og faciliteter. Spørger man fra Centerdetalje, kommer det Center altid med. Ronnie regner ikke selv priser ud.

**Svarformat.** Ronnie svarer med struktureret JSON, `{ tekst, centerIds }`, og `centerIds` må kun være id'er fra prompten. Hvert id bliver til en "Se [center] →"-knap. Hele samtalen sendes med i hvert kald.

**Andre steder i landet.** Spørger man om et andet sted (fx "Jeg har sommerhus i Hornbæk"), kalder Ronnie værktøjet `find_centre_naer_sted` med stednavnet (`data/ronnieLookup.js`). Appen slår stedet op med telefonens geokoder (samme som adressen i onboarding, ingen API-nøgle) og sender de op til 10 nærmeste Centre inden for 25 km, der matcher dine Filtre, med din personlige Ærlig årspris og afstanden fra stedet tilbage til Ronnie. Han svarer ud fra dem, og "Se [center] →" virker også for de fundne Centre. Kan stedet ikke findes, ligger det uden for Danmark, eller fejler opslaget, får Ronnie besked om det og siger det pænt. Opslaget huskes i samtalen, så man kan stille opfølgende spørgsmål.

## Prisalarmer og push
**Ansvarlig:** Bastian

En Prisalarm kan slås til på hver Favorit og på Nuværende medlemskab (Favoritter-skærmen) med en valgfri tærskel i kr/md. Tærsklen er forudfyldt med 50 kr/md, og et tomt felt betyder ethvert fald. Første gang en alarm slås til, spørger appen om lov til notifikationer, henter et Expo push-token og gemmer det på brugeren. Alarmerne virker også for anonyme brugere, og Favoritter-skærmen viser en note om, at de forsvinder, hvis appen slettes.

**Hvornår en alarm er opfyldt** (`data/priceAlerts.js`, ren JavaScript, som nat-jobbet også kan importere):
- *Favorit:* Besparelse = den gemte Ærlig årspris (`honestYearlyPrice` på Favoritten) minus den aktuelle. Om faldet skyldes en Kampagnepris eller en lavere Standardpris, er ligegyldigt.
- *Nuværende medlemskab:* Besparelse = brugerens månedspris minus Ærlig årspris for det billigste Center inden for brugerens maks. afstand (Præferencer). Der gives kun besked igen, når et Tilbud er billigere end det, der sidst gav besked (`notifiedHonestYearlyPrice`).
- Alarmen udløses, når Besparelsen er mindst tærsklen. Uden tærskel er det enhver Besparelse over 0 kr/md. Besparelsen afrundes først til hele øre, så støj fra regning med kommatal ikke tæller som et fald.
- Efter en besked gemmes den nye pris (`honestYearlyPrice` på Favoritten eller `notifiedHonestYearlyPrice`), så samme fald ikke giver besked to gange. Nat-jobbet skal gøre det samme efter en push.

**Datastruktur til nat-jobbet.** Alt ligger under `Users/<uid>` og læses med firebase-admin:

```
Users/<uid>/
  profile/currentMembership     { monthlyPrice, chainId? }   Nuværende medlemskab (uden = ingen)
  profile/discountProfile, birthDate, location, preferences/maxDistanceKm
  favorites/<centerId>          { addedAt, honestYearlyPrice?, priceAlert?: { thresholdPerMonth } }
                                priceAlert udeladt = ingen alarm; thresholdPerMonth 0 = ethvert fald
  currentMembershipAlert        { enabledAt, thresholdPerMonth?, notifiedHonestYearlyPrice? }
                                udeladt = ingen alarm på Nuværende medlemskab
  pushToken                     { expoPushToken: "ExponentPushToken[...]", platform, updatedAt }
```

Databasen gemmer ikke `null` eller tomme objekter, så et udeladt felt betyder `null`, og en Prisalarm uden tærskel gemmes som tærskel 0 (`toStoredFavorite`). Brug `fromStoredFavorites` og `fromStoredCurrentMembershipAlert` til at læse, `favoriteAlertTriggers` og `currentMembershipAlertTrigger` til at finde opfyldte alarmer, og `priceAlertMessage` til beskeden. Push-beskeden skal have `data: { centerId }` (gerne også `kind`), så et tryk åbner Centerdetalje. Svarer Expo Push Service med `DeviceNotRegistered`, slettes `Users/<uid>/pushToken`. Log ud fjerner også telefonens token fra kontoen.

**Push fra nat-jobbet** (`scraper/priceAlertPush.mjs`). Efter scraping regner nat-jobbet alle brugeres Prisalarmer på nattens nye priser med funktionerne ovenfor og sender en push pr. opfyldt alarm via Expo Push Service (gratis, højst 100 beskeder pr. kald, `scraper/expoPush.mjs`). Kun Centre fra Kæder, der blev opdateret i nat, kan udløse en alarm; en Kæde, der er sprunget over, eller som kun har håndindtastede data, giver ingen. Når Expo har taget imod en push, gemmes den nye pris, så samme fald ikke sendes igen. Det skrives i samme opdatering som nattens centerdata. Fejler afsendelsen, gemmes intet, og alarmen prøves igen næste nat. Svarer Expo `DeviceNotRegistered` med det samme, slettes tokenet straks. Kommer svaret først i kvitteringen, slettes det ved næste kørsel (ticket-id'erne gemmes under `PushTickets`, som kun service-accounten kan læse). Brugere uden token får ingen push, men ser alarmen via sikkerhedsnettet. En tør kørsel sender aldrig push, men rapporten viser, hvad der ville være sendt. Rapporten indeholder hverken uid'er eller tokens.

**Sikkerhedsnet i appen.** Når appen åbnes eller kommer i forgrunden, tjekkes alarmerne mod de aktuelle priser, og en opfyldt alarm vises som lokal notifikation (`usePriceAlertCheck` i `services/Notifications.js`). Tryk på en notifikation, lokal eller push, åbner Centerdetalje, også når appen startes af trykket.

**Opsætning af push.** Expo push-tokenet kræver et EAS-projekt (gratis): kør `npx eas init` med en Expo-konto, så havner `extra.eas.projectId` i `app.json`, eller sæt `EXPO_PUBLIC_EAS_PROJECT_ID` i `.env` (se `.env.example`). Uden id gemmes alarmerne stadig, og sikkerhedsnettet virker, men der hentes intet token.

**Expo Go på Android.** Remote push virker ikke i Expo Go på Android, og ældre udgaver af `expo-notifications` crasher allerede ved import dér. Appen bruger `expo-notifications` ~57.0.23 og indlæser slet ikke modulet i Expo Go på Android. Alarmerne gemmes stadig, og en opfyldt alarm vises som en besked i appen, når den åbnes. Push testes på en iPhone med Expo Go (fysisk telefon, ikke simulator).

## Natlig scraper
**Ansvarlig:** Jakob

`scraper/` er et selvstændigt Node-projekt (Node 22, ingen Expo og ingen AI), der henter rigtige Centre og Tilbud fra kædernes hjemmesider og skriver dem til Realtime Database med firebase-admin. I dag scrapes SATS, LOOP, PureGym og Fitness X; de øvrige Kæder bruger håndindtastede data, indtil deres parser har bestået alle tre testlag.

**Hvornår.** GitHub Actions (`.github/workflows/scraper.yml`) kører hver nat kl. 02:17 UTC (03:17 dansk vintertid) og kan startes manuelt under Actions → Natlig scraper → Run workflow, evt. som tør kørsel. Testene køres før hver kørsel. Rapporten står i jobbets oversigt og som artefakt.

**Secrets** (Settings → Secrets and variables → Actions):
- `FIREBASE_SERVICE_ACCOUNT`: hele service account-JSON'en på én linje
- `FIREBASE_DATABASE_URL`: database-URL'en
- `EXPO_ACCESS_TOKEN` (valgfri): kun hvis "push security" er slået til i Expo-projektet. Push via Expo Push Service er gratis.

**Høflighed.** Ærlig User-Agent, ét kald ad gangen og 2,5 sekunders pause mellem kaldene. SATS koster ca. 32 kald pr. nat: centerlisten, én side pr. Center og tre checkout-sider til gebyr og kampagne. Fitness X koster ca. 35 kald: centerlisten, prislisten og én side pr. Center. PureGym koster ca. 386 kald og ca. 20 minutter: centerlisten, prislisten og tre kald pr. Center (tilmeldingsformularen og én POST for hver Aldersgruppe). Derfor har workflowet 60 minutters timeout.

**PureGym.** Admingebyret er 0 kr, fordi kortbetaling er gratis (10 kr/md gælder kun Betalingsservice). Intropriser gemmes som Kampagnepris pr. Aldersgruppe, da de er forskellige for under 30 og 30+. Et medlemskab, der kun sælges til den ene Aldersgruppe (fx Core og Hold kun for 30+ i nogle Centre), springes over med en advarsel. Ældre Sagen-rabatten afhænger af medlemskabet (Core 15 %, Plus 20 %, Unlimited 25 %) og giver gratis oprettelse; Studerende får 40 % i 12 måneder, kun på Unlimited, og gratis oprettelse.

**LOOP** koster 2 kald pr. nat: centerlisten (alle Centre med priser, Admingebyr, kampagne og familiemedlemskab i ét inline objekt) og prissiden med rabatkortene (Studerende og Ældre Sagen 15 %, Oprettelse 199 kr). LOOP opkræver pr. 30 dage, så Tilbuddene har `billingIntervalDays: 30`, og Ærlig årspris regnes med 365/30 betalinger. Kampagnen "100 kr. resten af året" fordeles på de hele 30-dages-perioder til slutdatoen. Familiemedlemskabet (Træn med en makker) gemmes som Makkerpris pr. person for to: (589 + 10) / 2 = 299,50 kr pr. 30 dage. Familiens kampagne (100 kr for husstanden resten af året) gemmes som Makkerprisens kampagne pr. person (`partnerCampaignPrice`/`partnerCampaignMonths`) og regnes med i Ærlig årspris.

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
npm run verify:loop                       # LOOP: live-tjek og stikprøve (ca. 12 kald)
npm run verify:puregym                    # PureGym: stikprøve (14 kald)
npm run scrape:dry-run -- --chain puregym --limit 3   # kun én Kæde
npm run verify:fitnessx                   # Fitness X: stikprøve og hele Kæden (ca. 9 kald)
npm run scrape                            # skriver til databasen og sender push
npm run demo:prisfald -- --center sats-412 --dry-run   # demo: vis hvilke push et prisfald giver
npm run demo:prisfald -- --center sats-412             # demo: sænk priserne og send rigtige push
```

**Demo af push.** `npm run demo:prisfald` sænker alle Tilbud i ét Center med 100 kr/md (`--kr` for et andet beløb, højst 30 % pr. pris) og sender push for de Prisalarmer, det udløser, præcis som nat-jobbet gør. Sådan vises en push på en iPhone med Expo Go: slå en Prisalarm til på Centret som Favorit (gerne uden tærskel), så telefonen gemmer sit push-token. Kør derefter scriptet med Centrets id. Tryk på beskeden åbner Centerdetalje. Næste nats scraping sætter de rigtige priser tilbage (prishistorikken røres ikke). Favoritten husker dog den sænkede pris, så slå alarmen fra og til igen efter demoen for at måle fra den rigtige pris.

**Tre testlag.** En Kæde er først "færdig", når alle tre er grønne:
1. `npm test`: Prisalarmer og push gennem nat-jobbet med falsk database og falsk push-afsender (fald over/under/lig tærsklen, uden tærskel, kampagne og lavere Standardpris, Nuværende medlemskab, `DeviceNotRegistered` i ticket og kvittering, ugyldigt og manglende token, sprunget-over Kæde, bundter på 100 og tør kørsel). SATS-parseren mod gemte, trimmede svar fra sats.dk (`scraper/fixtures/sats/`) med præcist forventede Centre og Tilbud, sanity-reglerne og nat-jobbet end-to-end med en falsk database (normal kørsel, sanity-fejl, kæde-fejl, forsvundet 1/2/3 nætter). LOOP-parseren testes på samme måde mod `scraper/fixtures/loop/`, inkl. den urørte centerliste med alle 137 Centre. PureGym-parseren testes mod `scraper/fixtures/puregym/` (alle 128 Centre, Drupal-formularen og ajax-svarene for under 30 og 30+ med intropris).
2. Live-kørsel uden skrivning, der laver en rapport.
3. Stikprøve-bevis i `docs/verifikation-sats.md`: tre tilfældige Centre, hvor scraperens tal sammenlignes med de priser og den adresse, en besøgende ser på siden. Køres igen, hver gang parseren ændres. For LOOP laver `npm run verify:loop` både live-kørslen og stikprøven i `docs/verifikation-loop.md` (adresse og åbningstid på centersiden, priskortenes tekster og Ældre Sagens egen side). For PureGym laver `npm run verify:puregym` stikprøven i `docs/verifikation-puregym.md` (de synlige priskort og centersidens adresse, navn og koordinater), og `npm run scrape:dry-run -- --chain puregym --limit 3` er live-kørslen.

**Fitness X.** Centerlisten (`/find-center/`), centersidernes `sj_ajax_object` (alle Kædens medlemskaber; et medlemskab hører til et Center via Centrets GUID) og prislisten (`/oevrige-priser/`) til gebyrer og kontrol. Hvert Tilbud har Standardpris pr. Aldersgruppe (fx Kategori 1: 400 kr under 30, 450 kr for 30+). Træningsven er Rabatgruppen Træn med en makker: prisen pr. person bliver Makkerpris pr. Aldersgruppe, og engangsbeløbet på 100 kr for at tilføje makkeren lægges sammen med Opstartsgebyret og deles på to (`partnerSignupFee`, 80 kr pr. person), så det indgår i Ærlig årspris og Kvartalspris for den mulighed. Kampagner står kun som fri tekst ("189 kr./md. frem til 31. december 2026. Herefter 360 kr./md.") og læses defensivt: en tekst, der ikke kan læses, giver intet Tilbud frem for en gættet pris. Et Center uden link til centersiden prissættes ud fra de andre sider. Fixtures i `scraper/fixtures/fitnessx/`, stikprøve i `docs/verifikation-fitnessx.md`.

## Skærme
Navigation: første gang vises onboarding. Derefter fire faner i bunden (Find, Spørg Ronnie, Favoritter og Profil). Centerdetalje og Filtre åbnes som stack oven på fanerne, og Om os åbnes fra Profil.

- **Onboarding** (`screens/Onboarding/`, kun første gang): velkomst med Ronnie → adresse (geokodes) eller "Brug min placering" → fødselsdato → Rabatprofil → Nuværende medlemskab (egen månedspris og evt. Kæde, eller "Ingen") → Præferencer → gem din profil (konto) eller fortsæt anonymt. Fra velkomsten kan man logge ind med en eksisterende konto i stedet. Adresse og fødselsdato er krævet; resten kan springes over. Afslås adgang til placering, skriver man bare adressen

- **Find**: kort med din egen pin (blå) og en pin pr. Center, og en scrollbar liste over præcis de samme Centre nedenunder. Begge viser resultatet fra Matchning, så kun Centre inden for maks. afstand og dine Filtre vises, og sorteringen (Ærlig årspris, Kvartalspris, pris høj→lav eller afstand) gælder listen. Det Anbefalede Center har en orange pin og et ANBEFALET-mærke. Tryk på en pin viser Kæde, Ærlig årspris, Distance, nøgleord (fx sauna) og "Se mere", der åbner Centerdetalje. Matcher intet, viser Ronnie forslag til at løsne Filtrene. Data hentes fra Firebase, ellers vises håndindtastede eksempeldata. Kortet (`react-native-maps`) kræver ingen API-nøgle i Expo Go
- **Spørg Ronnie**: chat med Ronnie (se [Spørg Ronnie](#spørg-ronnie)). Før første besked vises færdige forslag. Ronnie anbefaler kun Centre fra GymFinder og sammenligner på din Ærlig årspris. Under hvert svar er der en "Se [center] →"-knap pr. Center, han nævner, som åbner Centerdetalje. Han husker samtalen, så man kan stille opfølgende spørgsmål. Fejl (ingen forbindelse, forbrugsgrænse nået) vises med en forståelig tekst og "Prøv igen"
- **Favoritter**: ♥ på et Center i listen på Find eller på Centerdetalje gør det til Favorit (tryk igen for at fjerne). Favoritter-skærmen viser hver Favorit med den aktuelle laveste Ærlig årspris blandt de Tilbud, du kan bruge dér, og hvor meget den er faldet eller steget, siden du gemte den. Tryk åbner Centerdetalje, og Fjern sletter Favoritten. Favoritterne følger kontoen og huskes efter genstart. Øverst står Nuværende medlemskab, og både den og hver Favorit kan få en Prisalarm med valgfri tærskel (se [Prisalarmer og push](#prisalarmer-og-push))
- **Profil**: ret alt fra onboarding (adresse, fødselsdato, Rabatprofil, Nuværende medlemskab og Præferencer). Ændringer slår straks igennem på Find og gemmes automatisk. Præferencerne er udgangspunktet for Filtre. Under Konto kan man gemme sin profil, logge ind eller logge ud
- **Om os**: kort om GymFinder, åbnes fra Profil
- **Log ind** (`screens/LoginScreen.js`): log ind med e-mail og adgangskode, fx på en ny telefon. Åbnes fra velkomsten og fra Profil
- **Centerdetalje**: adresse, Distance, Kæde og faciliteter (Ja/Nej/Ikke oplyst) og alle Centrets Tilbud, også dem dine Filtre ville skjule. Hvert Tilbud viser din Ærlig årspris og Kvartalspris, hvilken mulighed der er billigst for dig (Kampagnepris, en Rabat eller Makkerpris), Oprettelsesgebyr, Admingebyr, Binding og prisudregningen måned for måned, der giver præcis den samme Ærlig årspris som Matchning. Fylder du 30 inden for et år, og stiger prisen derfor, står det med måned. Spar mere-forslag vises, når de kan betale sig, og brugere i Træn med en makker ser Makkerpris pr. person og kædens krav. "Gå til tilmelding" åbner kædens side med et henvisningslink (`utm_source=gymfinder`). "Spørg Ronnie om dette center" åbner chatten med et færdigt spørgsmål om Centret
- **Filtre**: sortering (Ærlig årspris, Kvartalspris, pris høj→lav, afstand) og Filtre til Find: sauna, holdtræning, døgnåbent, adgang til flere centre, ingen Binding, maskiner og maks. afstand. Udgangspunktet er dine Præferencer. Centre, der med sikkerhed ikke opfylder et Filter, skjules; er det ukendt, vises Centret med "Ikke oplyst" (ⓘ) i listen og på pinnen. Filtre og sortering gemmes på telefonen og huskes efter genstart, og Nulstil går tilbage til Præferencerne

Fagord som Ærlig årspris, Kvartalspris, Makkerpris, Træn med en makker, Admingebyr, Binding, Ikke oplyst og Spar mere-forslag har en ⓘ, der åbner en forklaring. Alle forklaringer står ét sted, i `data/explanations.js`, og vises af `components/InfoButton.js`. Ronnie-maskotten ligger i `assets/ronnie.png` med gennemsigtig baggrund.

## Hvem har lavet hvad
Hver skærmfil har en `// Ansvarlig: <navn>`-kommentar øverst.

| Ansvarlig | Skærme og dele |
|---|---|
| Jakob | Onboarding (`screens/Onboarding/`), Profil (`screens/ProfileScreen.js`), Om os (`screens/AboutScreen.js`), Log ind (`screens/LoginScreen.js`), scraper og nat-job, afsendelse af push (`scraper/priceAlertPush.mjs`, `scraper/expoPush.mjs`) og demo-scriptet (`scraper/demoPriceDrop.mjs`) |
| Christian | Find (`screens/FindScreen.js`), Filtre (`screens/FiltersScreen.js`), Centerdetalje (`screens/CenterDetailScreen.js`) |
| Bastian | Spørg Ronnie (`screens/AskRonnieScreen.js`), Favoritter/Alarmer (`screens/FavoritesScreen.js`), Prisalarmer og push-registrering (`data/priceAlerts.js`, `services/PriceAlerts.js`, `services/Notifications.js`) |

## Teknologi
Som nævnt i rapport, har jeg brugt Matt Pocock's **/grill-with-docs** skill i samarbejde med Claude Code til at planlægge app'ens opsætning (https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md). Brugen og det endelige beslutningstræ er dokumenteret i rapporten.
