import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ChainLogo from './ChainLogo';

// Det, skærmlæsere skal høre for et Centers titel: "Kæde, Centernavn" (kun navnet uden Kæde).
export function centerTitleLabel(chain, name) {
  return [chain?.name, name].filter(Boolean).join(', ');
}

// Linjehøjde og pin-størrelse pr. størrelse, så logo og pin står midt på navnets første linje.
const SIZES = {
  card: { text: 'cardTitle', lead: 'centerTitleLeadCard', pin: 17 },
  screen: { text: 'title', lead: 'centerTitleLeadScreen', pin: 22 },
};

// Et Centers titel på én linje: Kædens logo-pille, en pin og Centrets navn. Bryder navnet over
// flere linjer, bliver logo og pin på første linje, og navnet brydes under sig selv. size er
// 'card' (kort og boksen på kortet) eller 'screen' (Centerdetalje). onInk bruges på blæk-blokken.
// Logo og pin er skjult for skærmlæsere; titlen læses som "Kæde, Centernavn" én gang. Står titlen
// inde i en knap (labelled=false), sætter knappen selv den tekst med centerTitleLabel.
export default function CenterTitle({
  chain,
  name,
  size = 'card',
  onInk = false,
  labelled = true,
}) {
  const parts = SIZES[size] ?? SIZES.card;
  const a11y = labelled
    ? {
        accessible: true,
        accessibilityRole: 'header',
        accessibilityLabel: centerTitleLabel(chain, name),
      }
    : {};

  return (
    <View style={GlobalStyle.centerTitle} {...a11y}>
      <View style={[GlobalStyle.centerTitleLead, GlobalStyle[parts.lead]]} aria-hidden>
        <ChainLogo chain={chain} onInk={onInk} />
        <Ionicons
          name="location-sharp"
          size={parts.pin}
          color={onInk ? colors.onInk : colors.text}
        />
      </View>
      <Text
        style={[
          GlobalStyle[parts.text],
          GlobalStyle.centerTitleName,
          onInk && GlobalStyle.textOnInk,
        ]}
        aria-hidden
      >
        {name}
      </Text>
    </View>
  );
}
