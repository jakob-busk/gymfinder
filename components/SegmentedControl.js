import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import GlobalStyle, { motion } from '../styles/GlobalStyle';
import { useReduceMotion } from './useReduceMotion';

// Ét valg blandt få muligheder, side om side, fx maks. afstand 5 / 15 / 50 km.
// options er [{ value, label }]. En sort pille glider hen under det valgte, så man ser skiftet.
export default function SegmentedControl({ options, value, onChange }) {
  const [width, setWidth] = useState(0);
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const position = useRef(new Animated.Value(activeIndex)).current;
  const reduceMotion = useReduceMotion();
  // Pillen er ét segment bred; padding på 4 i hver side trækkes fra.
  const segmentWidth = width > 0 ? (width - 8) / options.length : 0;

  useEffect(() => {
    // Ved "reducer bevægelse" springer pillen direkte til det valgte.
    if (reduceMotion) {
      position.setValue(activeIndex);
      return;
    }
    Animated.spring(position, {
      toValue: activeIndex,
      speed: 18,
      bounciness: 6,
      useNativeDriver: motion.native,
    }).start();
  }, [activeIndex, position, reduceMotion]);

  const translateX = Animated.multiply(position, segmentWidth);

  return (
    <View
      style={GlobalStyle.segmented}
      accessibilityRole="radiogroup"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {segmentWidth > 0 && options.some((option) => option.value === value) && (
        <Animated.View
          style={[
            GlobalStyle.segmentIndicator,
            { width: segmentWidth, transform: [{ translateX }] },
          ]}
        />
      )}
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
