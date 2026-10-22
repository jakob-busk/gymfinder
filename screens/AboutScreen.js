// Ansvarlig: Jakob
import { ScrollView, Text } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import RonnieMascot from '../components/RonnieMascot';

// Om os: forklarer hvad GymFinder er og hvordan det fungerer. Nås fra Profil.
export default function AboutScreen() {
  return (
    <ScrollView style={GlobalStyle.container}>
      <RonnieMascot size="small" />
      <Text style={GlobalStyle.bodyText}>
        GymFinder er bygget af studerende, for studerende. Idéen opstod fordi vi selv ville betale
        så lidt som muligt for et fitnessabonnement, uden at gå på kompromis med hvilke maskiner og
        faciliteter vi har brug for.
      </Text>
      <Text style={[GlobalStyle.bodyText, GlobalStyle.paragraph]}>
        I stedet for at sammenligne centrenes reklamepriser, viser GymFinder den ærlige årspris -
        det du reelt kommer til at betale i gennemsnit pr. måned over et år, inklusiv kampagne- og
        studietilbud. Vi samarbejder med fitnesscentrene om affiliate-aftaler, så det er gratis for
        dig at bruge.
      </Text>
      <Text style={GlobalStyle.sectionLabel}>Hvem er Ronnie?</Text>
      <Text style={GlobalStyle.bodyText}>
        Ronnie er vores maskot og din rådgiver. Han anbefaler kun Centre fra GymFinder og
        sammenligner altid på Ærlig årspris. Ronnie er en AI: hans svar bygger på priserne i
        GymFinder, og han kan tage fejl, så tjek altid prisen på Centret, før du melder dig ind.
      </Text>
    </ScrollView>
  );
}
