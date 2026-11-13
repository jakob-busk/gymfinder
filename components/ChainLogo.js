import { Image, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';

// Kædernes logoer (sorte PNG'er på gennemsigtig baggrund), slået op på Kædens id, som er det samme
// som i scraper/chains. height er logoets optiske højde i en 26 px høj pille: logoerne har meget
// forskellige proportioner (Loop er bred og tung, PureGym er et højt symbol med lille tekst), så
// samme højde ville få dem til at se forskelligt store ud. Bredden følger af billedets forhold.
const LOGOS = {
  puregym: { source: require('../assets/chains/puregym.png'), ratio: 248 / 120, height: 16 },
  sats: { source: require('../assets/chains/sats.png'), ratio: 379 / 120, height: 12 },
  fitnessx: { source: require('../assets/chains/fitnessx.png'), ratio: 467 / 120, height: 11 },
  loop: { source: require('../assets/chains/loop.png'), ratio: 955 / 120, height: 9 },
};

// Pillen i tre størrelser, der følger titlens linjehøjde (se CenterTitle). Logoet skaleres med.
const PILLS = {
  compact: { style: 'chainPillCompact', height: 20 },
  card: { style: 'chainPillCard', height: 22 },
  screen: { style: 'chainPillScreen', height: 28 },
  default: { style: 'chainPillDefault', height: 26 },
};
const BASE_PILL = 26;

// Om Kæden har et logo. Uden logo står Kædens navn i pillen, og Centret vises med fuldt navn.
export function hasChainLogo(chain) {
  return Boolean(chain && LOGOS[chain.id]);
}

// Kædens logo i lys farve på en lille blæk-pille, forrest i et Centers titel (se CenterTitle).
// Pillen har samme højde for alle Kæder; kun logoet i den varierer. Logoet farves i appen med
// tintColor (virker også på web, hvor react-native-web bruger et SVG-filter). Navnet læses op af
// skærmlæsere, og findes der ikke et logo, står navnet som tekst i pillen. onInk giver pillen en
// lys kant, så den ikke forsvinder på blæk-blokken. size er 'compact', 'card', 'screen' eller
// 'default'.
export default function ChainLogo({ chain, onInk = false, size = 'default' }) {
  if (!chain) return null;
  const logo = LOGOS[chain.id];
  const pill = PILLS[size] ?? PILLS.default;
  const logoHeight = logo ? Math.round((logo.height * pill.height) / BASE_PILL) : 0;

  return (
    <View
      style={[GlobalStyle.chainPill, GlobalStyle[pill.style], onInk && GlobalStyle.chainPillOnInk]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={chain.name}
    >
      {logo ? (
        <Image
          source={logo.source}
          style={[
            GlobalStyle.chainLogo,
            { height: logoHeight, width: Math.round(logoHeight * logo.ratio) },
          ]}
          resizeMode="contain"
        />
      ) : (
        <Text style={GlobalStyle.chainPillText}>{chain.name}</Text>
      )}
    </View>
  );
}
