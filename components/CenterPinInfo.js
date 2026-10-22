import { Pressable, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import NotStatedRow from './NotStatedRow';
import { centerKeywords } from '../data/findView';

// Boksen der vises på kortet, når man trykker på en Center-pin: Kæde, Ærlig årspris,
// Distance, nøgleord og "Ikke oplyst" for aktive Filtre, hvor det er ukendt.
// onShowDetails åbner Centerdetalje, onClose lukker boksen.
export default function CenterPinInfo({ match, isRecommended, onShowDetails, onClose }) {
  const { center, chain } = match;
  const keywords = centerKeywords(center);

  return (
    <View style={GlobalStyle.pinInfo}>
      <View style={GlobalStyle.cardHeader}>
        <Text style={GlobalStyle.cardTitle}>{chain?.name ?? center.name}</Text>
        {isRecommended && (
          <View style={GlobalStyle.badge}>
            <Text style={GlobalStyle.badgeText}>ANBEFALET</Text>
          </View>
        )}
      </View>
      <Text style={GlobalStyle.distanceText}>{center.name}</Text>
      <Text style={GlobalStyle.priceText}>
        {Math.round(match.honestYearlyPrice)} kr/md (ærlig årspris)
      </Text>
      <Text style={GlobalStyle.distanceText}>
        {match.distanceKm != null ? `${match.distanceKm.toFixed(1)} km fra dig` : 'Afstand ukendt'}
        {keywords.length > 0 ? ` · ${keywords.join(', ')}` : ''}
      </Text>
      <NotStatedRow notStated={match.notStated} />
      <View style={GlobalStyle.pinInfoActions}>
        <Pressable onPress={onClose} accessibilityRole="button">
          <Text style={GlobalStyle.link}>Luk</Text>
        </Pressable>
        <ButtonComponent title="Se mere →" type="primary" onPress={onShowDetails} />
      </View>
    </View>
  );
}
