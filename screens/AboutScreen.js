// Ansvarlig: Jakob
import { ScrollView, Text } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import RonnieMascot from '../components/RonnieMascot';

// Om os: forklarer hvad GymFinder er og hvordan det fungerer. Nås fra Profil.
export default function AboutScreen() {
  return (
    <ScrollView style={GlobalStyle.container}>
      <RonnieMascot />
      <Text>
        GymFinder er bygget af studerende, for studerende. Idéen opstod fordi vi selv ville betale
        så lidt som muligt for et fitnessabonnement, uden at gå på kompromis med hvilke maskiner og
        faciliteter vi har brug for.
      </Text>
      <Text style={GlobalStyle.paragraph}>
        I stedet for at sammenligne centrenes reklamepriser, viser GymFinder den ærlige årspris -
        det du reelt kommer til at betale i gennemsnit pr. måned over et år, inklusiv kampagne- og
        studietilbud. Vi samarbejder med fitnesscentrene om affiliate-aftaler, så det er gratis for
        dig at bruge.
      </Text>
      <Text style={GlobalStyle.paragraph}>
        Ronnie er vores maskot og din rådgiver. Han anbefaler kun Centre fra GymFinder og
        sammenligner altid på Ærlig årspris.
      </Text>
    </ScrollView>
  );
}
