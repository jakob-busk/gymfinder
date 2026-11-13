import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors, motion } from '../styles/GlobalStyle';

// Ikonet i fanebjælken. Den aktive fane får en violet pille bag ikonet, der vokser frem med en
// lille fjeder, når man skifter fane, så skiftet kan ses og mærkes.
export default function TabIcon({ name, focused, color, size }) {
  const grow = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(grow, {
      toValue: focused ? 1 : 0,
      speed: 16,
      bounciness: focused ? 8 : 0,
      useNativeDriver: motion.native,
    }).start();
  }, [focused, grow]);

  return (
    <View style={GlobalStyle.tabIcon}>
      <Animated.View
        style={[
          GlobalStyle.tabIconPill,
          {
            opacity: grow,
            transform: [
              { scaleX: grow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
            ],
          },
        ]}
      />
      <Ionicons
        name={focused ? name : `${name}-outline`}
        color={focused ? colors.onPrimary : color}
        size={size - 2}
      />
    </View>
  );
}
