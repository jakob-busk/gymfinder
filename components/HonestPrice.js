import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import InfoButton from './InfoButton';
import { formatNumber } from '../data/centerDetail';

// Ærlig årspris som stort tal med "kr." og "ærlig årspris · gns. pr. md." ved siden af og ⓘ, der
// forklarer begrebet. Bruges på kortene på Find, i boksen fra en pin og på Favoritter, så prisen
// ser ens ud overalt. size er 'card' (kortene på Find) eller 'compact' (pin-boks og Favoritter).
// onInk bruges på blæk-blokken (Anbefalet).
export default function HonestPrice({ amount, size = 'compact', onInk = false }) {
  const numberStyle = size === 'card' ? GlobalStyle.cardPrice : GlobalStyle.bigPrice;
  return (
    <View style={GlobalStyle.cardPriceRow}>
      <Text style={[numberStyle, onInk && GlobalStyle.priceOnInk]}>
        {formatNumber(Math.round(amount))}
      </Text>
      <View style={GlobalStyle.cardPriceUnitBox}>
        <Text style={[GlobalStyle.cardPriceUnit, onInk && GlobalStyle.textOnInk]}>kr.</Text>
        <View style={GlobalStyle.inlineRow}>
          <Text style={[GlobalStyle.cardPriceCaption, onInk && GlobalStyle.mutedOnInk]}>
            ærlig årspris · gns. pr. md.
          </Text>
          <InfoButton term="honestYearlyPrice" onInk={onInk} />
        </View>
      </View>
    </View>
  );
}
