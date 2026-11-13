import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import InfoButton from './InfoButton';
import { NOT_STATED_LABELS } from '../data/matchning';

// "Ikke oplyst: ..." for de aktive Filtre, hvor det er ukendt, om Centret opfylder dem.
// notStated er nøglerne fra Matchning. Viser ingenting, når listen er tom. onInk bruges i den
// mørke blok (det Anbefalede Center).
export default function NotStatedRow({ notStated, onInk = false }) {
  if (notStated.length === 0) return null;

  return (
    <View style={GlobalStyle.inlineRow}>
      <Text style={[GlobalStyle.notStatedText, onInk && GlobalStyle.mutedOnInk]}>
        Ikke oplyst: {notStated.map((key) => NOT_STATED_LABELS[key]).join(', ')}
      </Text>
      <InfoButton term="notStated" />
    </View>
  );
}
