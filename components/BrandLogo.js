import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import GlobalStyle, { motion } from '../styles/GlobalStyle';

// Tekstlogoet "GymFinder" i Fredoka med en violet prik bagefter, der pulserer langsomt som
// en puls i hvile. size er 'small' (toppen af Find) eller 'large' (Velkomst).
export default function BrandLogo({ size = 'small' }) {
  const sizeStyle = size === 'large' ? GlobalStyle.logoLarge : GlobalStyle.logoSmall;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 420,
          easing: motion.easeOut,
          useNativeDriver: motion.native,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: motion.easeInOut,
          useNativeDriver: motion.native,
        }),
        Animated.delay(900),
      ]),
    );
    beat.start();
    return () => beat.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });

  return (
    <View style={GlobalStyle.logoRow} accessibilityRole="header" accessibilityLabel="GymFinder">
      <Text style={[GlobalStyle.logoText, sizeStyle]}>GymFinder</Text>
      <Animated.View style={[GlobalStyle.logoDot, { transform: [{ scale }] }]} />
    </View>
  );
}
