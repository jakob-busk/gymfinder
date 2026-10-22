// Ansvarlig: Christian
import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';

// Filtre: midlertidige krav til oversigten på Find (faciliteter, Binding, maks. afstand).
// Pladsholder. Indtil videre bruger Find brugerens Præferencer fra Profil som Filtre.
export default function FiltersScreen({ navigation }) {
  return (
    <View style={GlobalStyle.container}>
      <Text style={GlobalStyle.paragraph}>
        Her kommer Filtre til oversigten. Indtil videre bruger Find dine Præferencer fra Profil.
      </Text>
      <View style={GlobalStyle.sortRow}>
        <ButtonComponent
          title="Ret Præferencer på Profil"
          type="primary"
          onPress={() => navigation.navigate('Faner', { screen: 'Profil' })}
        />
      </View>
    </View>
  );
}
