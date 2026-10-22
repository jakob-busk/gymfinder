import { Pressable, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';

// Ét valg blandt få muligheder, side om side, fx maks. afstand 5 / 15 / 50 km.
// options er [{ value, label }].
export default function SegmentedControl({ options, value, onChange }) {
  return (
    <View style={GlobalStyle.segmented} accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            style={[GlobalStyle.segment, active && GlobalStyle.segmentActive]}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={[GlobalStyle.segmentText, active && GlobalStyle.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
