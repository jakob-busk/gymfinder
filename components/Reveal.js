import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { motion } from '../styles/GlobalStyle';
import { useReduceMotion } from './useReduceMotion';

// Toner indholdet ind nedefra, én gang, når det vises første gang. index forskyder starten, så de
// første par elementer falder på plads ét efter ét (højst motion.maxStagger; resten kommer samtidig).
// Kun opacity og transform animeres, så det holder 60 fps. distance er hvor langt nedefra (højst
// ~30 px). Med "reducer bevægelse" står indholdet der bare med det samme.
export default function Reveal({ index = 0, distance = 22, delay = 0, style, children }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      progress.stopAnimation();
      progress.setValue(1);
      return undefined;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.large,
      delay: delay + Math.min(index, motion.maxStagger) * motion.stagger,
      easing: motion.easeOut,
      useNativeDriver: motion.native,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, index, delay, reduceMotion]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
