import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';

// Forklaring til pins på kortet: brugeren, det Anbefalede Center, hver Kædes bedste Center og
// Kædernes andre Centre, med de samme prikker som på kortet. text står foran i halvfed skrift, fx "12 Centre inden for 15 km".
export default function MapLegend({ text }) {
  const dot = (pinStyle, label) => (
    <View style={GlobalStyle.inlineRow}>
      <View style={[GlobalStyle.legendDot, pinStyle]} />
      <Text style={GlobalStyle.mapLegend}>{label}</Text>
    </View>
  );

  return (
    <View style={GlobalStyle.legendRow}>
      {Boolean(text) && <Text style={GlobalStyle.legendCount}>{text}</Text>}
      {dot(GlobalStyle.mapPinUser, 'Dig')}
      {dot(GlobalStyle.mapPinRecommended, 'Anbefalet')}
      {dot(GlobalStyle.mapPinChainBest, 'Bedst i kæden')}
      {dot(GlobalStyle.mapPinCenter, 'Andre centre')}
    </View>
  );
}
