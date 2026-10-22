// Ansvarlig: Bastian
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import RonnieMascot from '../components/RonnieMascot';

// Spørg Ronnie: chat med Ronnie, der anbefaler Centre fra GymFinder ud fra Ærlig årspris.
// Pladsholder, indtil chatten er bygget.
export default function AskRonnieScreen() {
  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['top']}>
      <ScrollView style={GlobalStyle.container}>
        <Text style={GlobalStyle.title}>Spørg Ronnie</Text>
        <RonnieMascot />
        <Text style={GlobalStyle.centeredText}>
          Hej, jeg er Ronnie! Snart kan du skrive til mig, hvad du leder efter, fx &quot;billigt
          med sauna uden binding&quot;. Så finder jeg det Center, der giver dig den laveste Ærlige
          årspris.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
