import { Pressable, ScrollView, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import { pinKind } from '../data/findView';

// Web-udgave af kortet. react-native-maps virker ikke i en browser, så her vises en pin pr.
// Center som små piller i stedet (papir med blæk-kant for Anbefalet, blæk for hver Kædes bedste
// Center, dæmpet for de andre). Bruges kun, når appen køres på web (localhost).
const PILL_STYLES = {
  recommended: GlobalStyle.webMapPinRecommended,
  chainBest: GlobalStyle.webMapPinChainBest,
  center: GlobalStyle.webMapPinCenter,
};

export default function CenterMap({ matches, chains, recommendedId, onSelect }) {
  return (
    <View style={[GlobalStyle.map, GlobalStyle.webMap]}>
      <Text style={GlobalStyle.mutedText}>
        Kortet vises kun på telefonen. Tryk på en pin herunder for at se boksen.
      </Text>
      <ScrollView style={GlobalStyle.webMapScroll} contentContainerStyle={GlobalStyle.webMapPins}>
        {matches.map(({ center }) => {
          const kind = pinKind(center.id, { chains, recommendedId });
          const isRecommended = kind === 'recommended';
          return (
            <Pressable
              key={center.id}
              onPress={() => onSelect(center.id)}
              style={[GlobalStyle.webMapPin, PILL_STYLES[kind]]}
            >
              <Text
                style={[
                  GlobalStyle.webMapPinText,
                  isRecommended && GlobalStyle.webMapPinTextRecommended,
                ]}
                numberOfLines={1}
              >
                {center.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
