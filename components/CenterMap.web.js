import { Pressable, ScrollView, Text, View } from 'react-native';

import GlobalStyle, { colors } from '../styles/GlobalStyle';

// Web-udgave af kortet. react-native-maps virker ikke i en browser, så her vises en pin pr.
// Center som knapper i stedet. Bruges kun, når appen køres på web (localhost).
export default function CenterMap({ matches, recommendedId, onSelect }) {
  return (
    <View style={[GlobalStyle.map, GlobalStyle.webMap]}>
      <Text style={GlobalStyle.mutedText}>
        Kortet vises kun på telefonen. Tryk på en pin herunder for at se boksen.
      </Text>
      <ScrollView style={GlobalStyle.webMapScroll} contentContainerStyle={GlobalStyle.webMapPins}>
        {matches.map(({ center }) => {
          const isRecommended = center.id === recommendedId;
          return (
            <Pressable
              key={center.id}
              onPress={() => onSelect(center.id)}
              style={[
                GlobalStyle.webMapPin,
                { backgroundColor: isRecommended ? colors.recommendedPin : colors.centerPin },
              ]}
            >
              <Text style={GlobalStyle.webMapPinText} numberOfLines={1}>
                📍 {center.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
