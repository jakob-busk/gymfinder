import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import BrandLogo from './BrandLogo';

// Toppen af en fane-skærm: titel (eller logoet) og evt. noget til højre, med en tynd neonlinje
// fra pink til cyan under.
export default function ScreenHeader({ title, logo = false, right }) {
  return (
    <View style={GlobalStyle.screenHeader}>
      <View style={GlobalStyle.titleRow}>
        {logo ? (
          <BrandLogo />
        ) : (
          <Text style={[GlobalStyle.title, GlobalStyle.screenHeaderTitle]}>{title}</Text>
        )}
        {right}
      </View>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={GlobalStyle.neonLine}
      />
    </View>
  );
}
