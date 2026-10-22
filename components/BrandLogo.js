import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';

// Tekstlogoet "GymFinder": "GYM" i pink og "FINDER" i cyan, i neonrør-skrift med glød.
// size er 'small' (toppen af Find) eller 'large' (Velkomst).
export default function BrandLogo({ size = 'small' }) {
  const sizeStyle = size === 'large' ? GlobalStyle.logoLarge : GlobalStyle.logoSmall;
  return (
    <View style={GlobalStyle.logoRow}>
      <Text style={[GlobalStyle.logoText, GlobalStyle.logoFirst, sizeStyle]}>GYM</Text>
      <Text style={[GlobalStyle.logoText, GlobalStyle.logoSecond, sizeStyle]}>FINDER</Text>
    </View>
  );
}
