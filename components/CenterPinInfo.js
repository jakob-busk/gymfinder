import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import CenterTitle from './CenterTitle';
import InfoButton from './InfoButton';
import NotStatedRow from './NotStatedRow';
import { formatDistance, formatNumber } from '../data/centerDetail';
import { centerKeywords } from '../data/findView';

// Boksen der vises på kortet, når man trykker på en Center-pin: titel (logo, pin, navn), Ærlig årspris (stort tal),
// Distance, nøgleord og "Ikke oplyst" for aktive Filtre, hvor det er ukendt.
// onShowDetails åbner Centerdetalje, onClose lukker boksen.
export default function CenterPinInfo({ match, isRecommended, onShowDetails, onClose }) {
  const { center, chain } = match;
  const keywords = centerKeywords(center);

  return (
    <View style={GlobalStyle.pinInfo}>
      <View style={GlobalStyle.cardHeader}>
        <View style={GlobalStyle.fill}>
          <CenterTitle chain={chain} name={center.name} size="compact" />
        </View>
        {isRecommended && (
          <View style={GlobalStyle.inlineRow}>
            <View style={GlobalStyle.badge}>
              <Text style={GlobalStyle.badgeText}>Anbefalet</Text>
            </View>
            <InfoButton term="recommended" />
          </View>
        )}
      </View>
      <View style={GlobalStyle.cardPriceRow}>
        <Text style={GlobalStyle.bigPrice}>{formatNumber(Math.round(match.honestYearlyPrice))}</Text>
        <View style={GlobalStyle.cardPriceUnitBox}>
          <Text style={GlobalStyle.cardPriceUnit}>kr.</Text>
          <View style={GlobalStyle.inlineRow}>
            <Text style={GlobalStyle.cardPriceCaption}>ærlig årspris · gns. pr. md.</Text>
            <InfoButton term="honestYearlyPrice" />
          </View>
        </View>
      </View>
      <Text style={GlobalStyle.distanceText}>
        {match.distanceKm != null ? `${formatDistance(match.distanceKm)} fra dig` : 'Afstand ukendt'}
        {keywords.length > 0 ? ` · ${keywords.join(', ')}` : ''}
      </Text>
      <NotStatedRow notStated={match.notStated} />
      <View style={GlobalStyle.pinInfoActions}>
        <ButtonComponent title="Luk" type="text" size="small" onPress={onClose} />
        <ButtonComponent title="Se detaljer" type="secondary" size="small" onPress={onShowDetails} />
      </View>
    </View>
  );
}
