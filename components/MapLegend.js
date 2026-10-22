import { Text, View } from 'react-native';

import GlobalStyle, { colors } from '../styles/GlobalStyle';

// Forklaring til pins på kortet: brugeren, det Anbefalede Center og de andre Centre, i den
// aktive stils farver. text står foran, fx "12 Centre inden for 15 km".
export default function MapLegend({ text }) {
  const dot = (color, label) => (
    <View style={GlobalStyle.inlineRow}>
      <View style={[GlobalStyle.legendDot, { backgroundColor: color }]} />
      <Text style={GlobalStyle.mapLegend}>{label}</Text>
    </View>
  );

  return (
    <View style={GlobalStyle.legendRow}>
      {Boolean(text) && <Text style={GlobalStyle.mapLegend}>{text}</Text>}
      {dot(colors.userPin, 'Dig')}
      {dot(colors.recommendedPin, 'Anbefalet')}
      {dot(colors.centerPin, 'Andre Centre')}
    </View>
  );
}
