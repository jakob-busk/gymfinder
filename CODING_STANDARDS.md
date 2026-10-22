# GymFinder – kodestandard

Gælder al kode i GymFinder (React Native, Expo SDK 57, JavaScript). Ved tvivl: følg mønstret i eksisterende kode, og ret denne fil frem for at afvige stille.

## 1. Mappestruktur og filnavne

```
App.js              navigation og app-dækkende state
screens/            én fil pr. skærm: FindScreen.js, ProfileScreen.js
screens/<Stack>/    skærme der kun lever i en stack (fx screens/CenterStack/)
components/         genbrugelige UI-dele: ButtonComponent.js, CenterCard.js
styles/GlobalStyle.js  fælles StyleSheet + farver
database/firebase.js   al Firebase-init (app, rtdb, auth) – kun her
services/           kald ud af appen: AI, lokation, notifikationer (Request.js, Notifications.js)
data/               konstanter, mock-data og ren forretningslogik (const.js, matchning)
scraper/            Node-scraper (ikke en del af app-bundlen)
```

- Navngiv komponent- og skærmfiler i PascalCase; skærme slutter på `Screen`.
- Navngiv rene logik-/hjælpefiler i camelCase (`gymLogic.js`, `priceUtils.js`).
- Læg aldrig Firebase-, fetch- eller AI-kald direkte i en skærm; kald en funktion i `database/` eller `services/`.

## 2. Komponenter

- Skriv komponenter som `export default function Navn({ prop1, prop2 }) { … }` – én default-komponent pr. fil.
- Skriv handlers inde i komponenten som arrow-funktioner: `const handleSave = async () => { … };`.
- Destrukturér props i signaturen; skærme modtager `{ navigation, route }`.
- Brug kun hooks fra `react` (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`) og `useFocusEffect` fra React Navigation til genindlæsning ved fokus.
- Returnér altid oprydning fra effekter, der lytter: `return unsubscribe;`.
- Vis eksplicitte tilstande: indlæser (`ActivityIndicator`), tom liste (kort dansk tekst), data.
- Brug `FlatList` med `keyExtractor` til lister – aldrig `index` som key, når der findes et id.

## 3. Styles

- Læg styles i `styles/GlobalStyle.js` med `StyleSheet.create`; eksportér `GlobalStyle` som default og `colors` som named export.
- Brug altid `colors.*` – ingen hex-koder i skærme og komponenter.
- Inline styles kun til én enkelt engangsværdi (fx `{ height: 12 }` som spacer).
- Brug `SafeAreaProvider` i `App.js` og `SafeAreaView` fra `react-native-safe-area-context` i skærme i stedet for faste `paddingTop`-værdier.

## 4. Navigation

- `NavigationContainer` → rod-`Stack.Navigator` i `App.js`. Fanerne (`Tab.Navigator`) ligger som én skærm i rod-stacken, og detaljeskærme, der skal kunne åbnes fra flere faner (fx Centerdetalje og Filtre), ligger ved siden af fanerne i rod-stacken, så de vises oven på fanerne.
- Flow med under-skærme, der kun hører til én fane (fx Profil → Om os), lægges som en `Stack.Navigator` og bruges som `component` på fanen.
- Ikoner: `Ionicons` fra `@expo/vector-icons`, sat via `options.tabBarIcon`.
- Send data mellem skærme som params, og læs dem defensivt:

```js
navigation.navigate('CenterDetaljer', { centerId: center.id });
const centerId = route?.params?.centerId;
```

- Send id'er, ikke hele objekter, når data kan hentes fra en kilde (Firebase/const).
- Del app-dækkende state (bruger, Rabatprofil) via React Context frem for render-callbacks (`{() => <Screen user={user} />}`).

## 5. Firebase

- Initialisér én gang i `database/firebase.js` og eksportér `rtdb` og `auth`:

```js
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const rtdb = getDatabase(firebaseApp, process.env.EXPO_PUBLIC_FIREBASE_DB_URL);
export const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});
```

- Læs med `onValue(ref(rtdb, 'Centers'), (snap) => …)` i `useEffect` og returnér unsubscribe.
- Skriv med `await push/set/update/remove(ref(rtdb, \`Centers/${id}\`), data)` inde i `try/catch`.
- Brug PascalCase-flertal til rod-noder (`Centers`, `Offers`, `Favorites`), og gem bruger-data under `Users/<uid>/…`.
- Lyt på login-status med `onAuthStateChanged` i `App.js` og vælg auth- eller app-stack ud fra `user`.

## 6. Lokation, notifikationer og AI

- Lokation: kald `Location.requestForegroundPermissionsAsync()`; ved `status !== 'granted'` returnér tidligt og fald tilbage til brugerens adresse.
- Notifikationer: sæt `Notifications.setNotificationHandler` øverst i `App.js`; tilladelse og planlægning ligger i `services/Notifications.js`. Simple tjek returnerer `true`/`false`/`null`; funktioner med flere mulige udfald (fx push-registrering) må returnere en kort status-streng (`'registered'`, `'denied'`, `'unsupported'` …) eller et objekt med en `reason`, så skærmen kan vise den rigtige besked.
- AI (Ronnie): ét kald pr. funktion i `services/`, der returnerer `{ role: 'assistant', content }`. Systemprompten ligger i sin egen fil.
- Netværkskald følger samme form:

```js
export async function fetchOffers() {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/offers`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

## 7. Hemmeligheder

- Læg alle nøgler og URL'er i `.env`, og læs dem kun via `process.env.EXPO_PUBLIC_*`. `.env` står i `.gitignore`; commit en `.env.example` uden værdier.
- Skriv aldrig nøgler, Firebase-config eller tokens direkte i koden – heller ikke midlertidigt.
- Husk at `EXPO_PUBLIC_*` ender i app-bundlen: brug kun nøgler, der må være synlige for klienten (begræns dem i Firebase/udbyderens konsol).

## 8. Fejlhåndtering

- Omgiv alle async-kald med `try/catch`.
- Brugerrettede fejl: `Alert.alert('Kunne ikke gemme', error.message)` – titel på dansk.
- Baggrundsfejl uden brugerhandling: `console.error('Hent tilbud fejlede:', error)`.
- Validér input først og returnér tidligt: `if (!address.trim()) return Alert.alert('Udfyld adresse.');`.
- Bekræft destruktive handlinger med `Alert.alert` og knapperne `Annuller` og et verbum, der passer til handlingen (`style: 'destructive'`), fx `Slet` for data, der forsvinder helt, og `Fjern` for at tage noget ud af en liste (fx en Favorit).

## 9. Domænesprog (CONTEXT.md)

- Brug termerne fra `CONTEXT.md` præcist i UI-tekst, kommentarer, issues og commits: Kæde, Center, Tilbud, Abonnementstype, Ærlig årspris, Kvartalspris, Rabat, Rabatgruppe, Rabatprofil, Makkerpris, Filter, Præference, Anbefalet, Favorit, Prisalarm, Besparelse, Ronnie.
- Undgå de ord, der står under _Avoid_ (fx "gym", "plan", "deal", "studiepris" som generelt begreb, "chatbot").
- Brug faste engelske navne i koden:

| Term | I koden |
|---|---|
| Kæde / Center / Tilbud | `chain` / `center` / `offer` |
| Ærlig årspris / Kvartalspris | `honestYearlyPrice` / `quarterlyPrice` |
| Rabat / Rabatgruppe / Rabatprofil | `discount` / `discountGroup` / `discountProfile` |
| Favorit / Prisalarm / Besparelse | `favorite` / `priceAlert` / `saving` |

## 10. Kommentarer og sprog

- Øverst i hver skærm: `// Ansvarlig: <navn>` på første linje.
- Skriv kommentarer og al UI-tekst på dansk; identifiers på engelsk.
- Placér kommentaren på linjen over koden, kort og om *hvorfor* – ikke i forlængelse af funktionssignaturen.
- Ingen udkommenteret kode eller `console.log` i commits. Undtagelse: CLI-scripts i `scraper/` (fx `index.mjs`, `seed.mjs`, `verify*.mjs`) må skrive deres resultat og rapporter til stdout med `console.log`; fejl skrives stadig med `console.error`.

## 11. Formatering

- 2 mellemrum, semikolon, enkelte quotes (`'…'`) i JS og dobbelte i JSX-attributter (`title="Gem"`), trailing comma i flerlinjede objekter/arrays.
- Importrækkefølge med tom linje mellem grupper: `react` → `react-native` → tredjepart/Expo → lokale filer.
- Hold linjer under ca. 100 tegn; bryd JSX med mange props over flere linjer.

## 12. Test

- Matchning (filtrering, Anbefalet, Ærlig årspris) testes med Jest via `jest-expo`; testfiler hedder `<modul>.test.js` ved siden af modulet. Kør med `npm test`.
- Scraperen testes med Nodes indbyggede `node:test` + `node:assert/strict`; kør med `npm test` i `scraper/`.
- Hold logik, der skal testes, i rene funktioner uden React- eller Firebase-afhængigheder.
