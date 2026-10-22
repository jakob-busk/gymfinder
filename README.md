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

## Test
Matchning (`data/matchning.js`: Ærlig årspris, Kvartalspris, Rabatter, Filtre, Anbefalet og sortering) testes med Jest via jest-expo:

npm test

## Skærme
- **Dashboard**: liste over Centre via Matchning, sorteret efter Ærlig årspris, Kvartalspris, pris høj→lav eller afstand, med det Anbefalede fremhævet. Håndindtastede eksempeldata
- **Profil**: brugerens oplysninger, Rabatprofil og redigerbare Præferencer (maskiner, faciliteter, binding, maks. afstand)
- **Om os**: kort om GymFinder

## Teknologi
Som nævnt i rapport, har jeg brugt Matt Pocock's **/grill-with-docs** skill i samarbejde med Claude Code til at planlægge app'ens opsætning (https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md). Brugen og det endelige beslutningstræ er dokumenteret i rapporten.
