import { View, Text } from 'react-native';
import GlobalStyle from '../styles/GlobalStyle';

export default function AboutScreen() { // Om os siden, som forklarer hvad GymFinder er og hvordan det fungerer.
  return (
    <View style={GlobalStyle.container}>
      <Text style={GlobalStyle.title}>Om os</Text>
      <Text>
        GymFinder er bygget af studerende, for studerende. Idéen opstod fordi vi selv ville betale så lidt
        som muligt for et fitnessabonnement, uden at gå på kompromis med hvilke maskiner og faciliteter vi
        har brug for.
      </Text>
      <Text style={{ marginTop: 12 }}>
        I stedet for at sammenligne centrenes reklamepriser, viser GymFinder den ærlige årspris - det du
        reelt kommer til at betale i gennemsnit pr. måned over et år, inklusiv kampagne- og
        studietilbud. Vi samarbejder med fitnesscentrene om affiliate-aftaler, så det er gratis for dig at bruge.
      </Text>
    </View>
  );
}
