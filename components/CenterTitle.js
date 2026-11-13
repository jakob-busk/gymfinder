import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ChainLogo, { hasChainLogo } from './ChainLogo';
import { centerDisplayName } from '../data/centerDisplayName';

// Centrets navn ved siden af logoet: uden Kædens navn foran ("Lyngby" ved Fitness X-logoet). Har
// Kæden intet logo, står det fulde navn, så Kæden stadig kan ses.
function shortName(chain, name) {
  return hasChainLogo(chain) ? centerDisplayName(name, chain) : name;
}

// Det, skærmlæsere skal høre for et Centers titel: "Kæde, Centernavn", fx "Fitness X, Lyngby".
export function centerTitleLabel(chain, name) {
  return [chain?.name, shortName(chain, name)].filter(Boolean).join(', ');
}

// Tre afstemte størrelser: pillen er lige så høj som navnets linjehøjde, pin-ikonet er omtrent
// versalhøjde + lidt, og forspandet (pille + pin) har samme højde som navnets første linje, så
// alt står på samme midte. compact er boksen på kortet, card er kortene, screen er Centerdetalje.
const SIZES = {
  compact: { text: 'centerTitleCompact', lead: 'centerTitleLeadCompact', pin: 14 },
  card: { text: 'centerTitleCard', lead: 'centerTitleLeadCard', pin: 16 },
  screen: { text: 'centerTitleScreen', lead: 'centerTitleLeadScreen', pin: 20 },
};

// Et Centers titel på én linje: Kædens logo-pille, en pin og Centrets navn (uden Kædens navn).
// Bryder navnet over flere linjer, bliver logo og pin på første linje, og navnet brydes under sig
// selv. onInk bruges på blæk-blokken. Logo og pin er skjult for skærmlæsere; titlen læses som
// "Kæde, Centernavn" én gang. Står titlen inde i en knap (labelled=false), sætter knappen selv den
// tekst med centerTitleLabel. name er Centrets fulde navn.
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
        <ChainLogo chain={chain} onInk={onInk} size={size} />
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
        {shortName(chain, name)}
      </Text>
    </View>
  );
}
