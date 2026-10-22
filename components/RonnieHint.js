import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import RonnieMascot from './RonnieMascot';

// Lille Ronnie med en kort replik, fx på onboarding-trin og ved prisfald.
// Bruges aldrig ved priser, advarsler, fejl eller login.
// pose er Ronnies positur (se RonnieMascot).
export default function RonnieHint({ children, pose }) {
  return (
    <View style={GlobalStyle.ronnieHint}>
      <RonnieMascot size="tiny" pose={pose} />
      <Text style={GlobalStyle.ronnieHintText}>{children}</Text>
    </View>
  );
}
