// Ansvarlig: Jakob
import { ScrollView, Text } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import RonnieMascot from '../components/RonnieMascot';

// Om GymFinder: hvad GymFinder er, og "Sådan virker det" (Anbefalet, hvor priserne kommer fra,
// affiliate og kontakt). Nås fra Profil. Teksterne bygger på koden: Anbefalet og sorteringen
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

      <Text style={GlobalStyle.groupTitle}>Hvordan vælges Anbefalet?</Text>
      <Text style={GlobalStyle.bodyText}>
        Anbefalet er det Tilbud med den laveste Ærlig årspris blandt de Centre, der med sikkerhed
        opfylder dine Filtre. Ærlig årspris er det, du reelt betaler i gennemsnit pr. måned over et
        år, med Oprettelsesgebyr, Admingebyr, Kampagnepriser og dine Rabatter regnet med. Centre,
        hvor noget er "Ikke oplyst", kan ikke blive Anbefalet. Anbefalet er det samme, uanset hvilken
        sortering du vælger.
      </Text>

      <Text style={GlobalStyle.groupTitle}>Hvor kommer priserne fra?</Text>
      <Text style={GlobalStyle.bodyText}>
        Hver nat henter vi priser og Centre direkte fra Kædernes egne hjemmesider. Ser en pris
        mærkelig ud (fx hvis den ændrer sig meget på én nat), beholder vi den gamle, indtil den er
        tjekket. Priserne kan derfor være op til et døgn gamle, så tjek altid prisen hos Kæden, før
        du melder dig ind.
      </Text>

      <Text style={GlobalStyle.groupTitle}>Tjener vi penge på det?</Text>
      <Text style={GlobalStyle.bodyText}>
        Vi samarbejder med fitnesscentrene om affiliate-aftaler, så det er gratis for dig at bruge
        GymFinder. Aftalerne indgår ikke i beregningen: rækkefølgen og Anbefalet regnes kun ud fra
        pris, dine Filtre og afstand.
      </Text>

      <Text style={GlobalStyle.groupTitle}>Hvem er Ronnie?</Text>
      <Text style={GlobalStyle.bodyText}>
        Ronnie er vores maskot og din rådgiver. Han anbefaler kun Centre fra GymFinder og
        sammenligner altid på Ærlig årspris. Ronnie er en AI: hans svar bygger på priserne i
        GymFinder, men han kan tage fejl, så tjek altid prisen hos Centret, før du melder dig ind.
      </Text>

      <Text style={GlobalStyle.groupTitle}>Kontakt</Text>
      <Text style={GlobalStyle.bodyText}>
        GymFinder er et studieprojekt. Har du spørgsmål, eller har du fundet en pris, der ikke
        passer, så skriv til holdet bag GymFinder. Når du melder dig ind, er det altid prisen på
        Kædens egen side, der gælder.
      </Text>
    </ScrollView>
  );
}
