import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';

// Vises i stedet for Centre og priser, når centerdata ikke kunne hentes (ingen forbindelse).
// onRetry prøver at hente igen (useCenterData().retry). Ronnie er ikke med ved fejl.
export default function OfflineNotice({ onRetry }) {
  return (
    <View style={GlobalStyle.warningBox}>
      <View style={GlobalStyle.warningHeader}>
        <Ionicons name="cloud-offline-outline" size={20} color={colors.text} />
        <Text style={GlobalStyle.warningTitle}>Ingen forbindelse</Text>
      </View>
      <Text style={GlobalStyle.bodyText}>
        GymFinder kunne ikke hente Centre og priser. Tjek, at telefonen er på nettet, og prøv igen.
      </Text>
      <View style={GlobalStyle.paragraph}>
        <ButtonComponent title="Prøv igen" type="primary" onPress={onRetry} />
      </View>
    </View>
  );
}
