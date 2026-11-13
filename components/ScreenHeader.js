import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import BrandLogo from './BrandLogo';
import Reveal from './Reveal';

// Toppen af en fane-skærm: stor titel (eller logoet) og evt. noget til højre, med en tynd
// blæklinje under som på en avisside. Titlen glider ind, når skærmen åbnes.
export default function ScreenHeader({ title, logo = false, right }) {
  return (
    <Reveal distance={14} style={GlobalStyle.screenHeader}>
      <View style={GlobalStyle.titleRow}>
        {logo ? (
          <BrandLogo />
        ) : (
          <Text style={[GlobalStyle.title, GlobalStyle.screenHeaderTitle]}>{title}</Text>
        )}
        {right}
      </View>
      <View style={GlobalStyle.headerRule} />
    </Reveal>
  );
}
