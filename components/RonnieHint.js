import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import RonnieMascot from './RonnieMascot';

// Ronnie på sin cirkel med en kort replik i en taleboble, fx på onboarding-trin og ved prisfald.
// Bruges aldrig ved priser, advarsler, fejl eller login.
// pose er Ronnies positur (se RonnieMascot), og den styrer også cirklens farve.
export default function RonnieHint({ children, pose }) {
  return (
    <View style={GlobalStyle.ronnieHint}>
      <RonnieMascot size="hint" pose={pose} />
      <View style={GlobalStyle.ronnieHintBubble}>
        <View style={[GlobalStyle.bubbleTail, GlobalStyle.bubbleTailLeft]} />
        <Text style={GlobalStyle.ronnieHintText}>{children}</Text>
      </View>
    </View>
  );
}
