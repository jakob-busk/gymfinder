import { Image, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';

// Kædernes logoer (sorte PNG'er på gennemsigtig baggrund), slået op på Kædens id, som er det samme
// som i scraper/chains. height er logoets optiske højde i pillen: logoerne har meget forskellige
// proportioner (Loop er bred og tung, PureGym er et højt symbol med lille tekst), så samme højde
// ville få dem til at se forskelligt store ud. Bredden følger af billedets forhold (ratio).
const LOGOS = {
  puregym: { source: require('../assets/chains/puregym.png'), ratio: 248 / 120, height: 16 },
  sats: { source: require('../assets/chains/sats.png'), ratio: 379 / 120, height: 12 },
  fitnessx: { source: require('../assets/chains/fitnessx.png'), ratio: 467 / 120, height: 11 },
  loop: { source: require('../assets/chains/loop.png'), ratio: 955 / 120, height: 9 },
};

// Kædens logo i lys farve på en lille blæk-pille, forrest i et Centers titel (se CenterTitle).
// Pillen har samme højde for alle Kæder; kun logoet i den varierer. Logoet farves i appen med
// tintColor (virker også på web, hvor react-native-web bruger et SVG-filter). Navnet læses op af
// skærmlæsere, og findes der ikke et logo, står navnet som tekst i pillen. onInk giver pillen en
// lys kant, så den ikke forsvinder på blæk-blokken.
export default function ChainLogo({ chain, onInk = false }) {
  if (!chain) return null;
  const logo = LOGOS[chain.id];

  return (
    <View
      style={[GlobalStyle.chainPill, onInk && GlobalStyle.chainPillOnInk]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={chain.name}
    >
      {logo ? (
        <Image
          source={logo.source}
          style={[
            GlobalStyle.chainLogo,
            { height: logo.height, width: Math.round(logo.height * logo.ratio) },
          ]}
          resizeMode="contain"
        />
      ) : (
        <Text style={GlobalStyle.chainPillText}>{chain.name}</Text>
      )}
    </View>
  );
}
