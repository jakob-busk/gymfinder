import { useRef } from 'react';
import { Animated } from 'react-native';

import { motion } from '../styles/GlobalStyle';

// Tryk-feedback: elementet trykkes en anelse ind og fjedrer tilbage, når fingeren slipper.
// Giver { scaleStyle, onPressIn, onPressOut } til en Animated-komponent.
export function usePressScale(to = motion.pressScale) {
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (value) =>
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: value === 1 ? 10 : 0,
      useNativeDriver: motion.native,
    }).start();

  return {
    scaleStyle: { transform: [{ scale }] },
    onPressIn: () => springTo(to),
    onPressOut: () => springTo(1),
  };
}
