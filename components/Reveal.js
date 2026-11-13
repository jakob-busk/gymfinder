import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { motion } from '../styles/GlobalStyle';

// Toner indholdet ind nedefra, én gang, når det vises første gang. index forskyder starten, så en
// liste falder på plads element for element i stedet for at stå der på én gang. Kun opacity og
// transform animeres, så det holder 60 fps. distance er hvor langt nedefra (højst ~30 px).
export default function Reveal({ index = 0, distance = 22, delay = 0, style, children }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.large,
      delay: delay + Math.min(index, motion.maxStagger) * motion.stagger,
      easing: motion.easeOut,
      useNativeDriver: motion.native,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, index, delay]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
