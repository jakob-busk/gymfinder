// Ansvarlig: Jakob
import { ScrollView, Text } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import RonnieMascot from '../components/RonnieMascot';

// Om GymFinder: hvad GymFinder er, og "Sådan virker det" (Anbefalet, hvor priserne kommer fra,
// hvordan vi tjener penge og Ronnie). Nås fra Profil. Teksterne bygger på koden: Anbefalet og rækkefølgen
// regnes i data/matchning.js ud fra pris, Filtre og afstand, og priserne hentes af den natlige
// scraper (scraper/, docs/adr/0001).
export default function AboutScreen() {
  return (
    <ScrollView style={GlobalStyle.container} contentContainerStyle={GlobalStyle.aboutContent}>
      <RonnieMascot size="small" />
      <Text style={GlobalStyle.bodyText}>
        GymFinder er bygget af studerende, for studerende. Idéen opstod, fordi vi selv ville betale
        så lidt som muligt for et fitnessabonnement uden at gå på kompromis med de maskiner og
        faciliteter, vi har brug for.
      </Text>

      <Text style={GlobalStyle.sectionLabel}>Sådan virker det</Text>

      <Text style={GlobalStyle.groupTitle}>Hvordan vælger vi det anbefalede center?</Text>
      <Text style={GlobalStyle.bodyText}>
        Vi vælger det center, der passer bedst til dig ud fra pris og afstand. Et center lidt
        længere væk skal være mærkbart billigere for at vinde. Prisen er den ærlige årspris: det, du
        reelt betaler i gennemsnit pr. måned over et år, med oprettelse, admingebyr, kampagnepriser
        og dine rabatter regnet med. Vi vælger kun blandt centre, der helt sikkert passer til dine
        ønsker, så et center, hvor noget er "ikke oplyst", kan ikke blive anbefalet.
      </Text>

      <Text style={GlobalStyle.groupTitle}>Hvor kommer priserne fra?</Text>
      <Text style={GlobalStyle.bodyText}>
        Hver nat henter vi priser og centre direkte fra kædernes egne hjemmesider. Ser en pris
        mærkelig ud (fx hvis den ændrer sig meget på én nat), beholder vi den gamle, indtil den er
        tjekket. Priserne kan derfor være op til et døgn gamle, så tjek altid prisen hos kæden, før
        du melder dig ind.
      </Text>

      <Text style={GlobalStyle.groupTitle}>Tjener vi penge på det?</Text>
      <Text style={GlobalStyle.bodyText}>
        Nogle kæder betaler os et lille beløb, når du melder dig ind via GymFinder. Derfor er appen
        gratis. Aftalerne indgår ikke i beregningen: rækkefølgen og anbefalingen regnes kun ud fra
        pris, dine ønsker og afstand.
      </Text>

      <Text style={GlobalStyle.groupTitle}>Hvem er Ronnie?</Text>
      <Text style={GlobalStyle.bodyText}>
        Ronnie er vores maskot og din rådgiver. Han anbefaler kun centre fra GymFinder og
        sammenligner altid på ærlig årspris. Ronnie er en AI: hans svar bygger på priserne i
        GymFinder, men han kan tage fejl, så tjek altid prisen hos centret, før du melder dig ind.
      </Text>
    </ScrollView>
  );
}
