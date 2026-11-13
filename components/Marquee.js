import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import GlobalStyle, { motion } from '../styles/GlobalStyle';

const COPIES = 3;
// Pixels pr. sekund. Langsomt nok til at kunne læses, hurtigt nok til at ses.
const SPEED = 36;

// Et skråt bånd, hvor ordene løber stille forbi, som på en stadion-banner. words er en liste af
// korte ord; de sættes sammen med en mint ✳ imellem. Teksten står tre gange efter hinanden, og
// båndet flyttes præcis én kopi, før det starter forfra, så løkken ikke kan ses.
export default function Marquee({ words }) {
  const [copyWidth, setCopyWidth] = useState(0);
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (copyWidth === 0) return undefined;
    offset.setValue(0);
    const loop = Animated.loop(
      Animated.timing(offset, {
        toValue: -copyWidth,
        duration: (copyWidth / SPEED) * 1000,
        easing: Easing.linear,
        useNativeDriver: motion.native,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [copyWidth, offset]);

  const copy = (index) => (
    <Text
      key={index}
      style={GlobalStyle.marqueeText}
      numberOfLines={1}
      onLayout={index === 0 ? (event) => setCopyWidth(event.nativeEvent.layout.width) : undefined}
    >
      {words.map((word) => (
        <Text key={word}>
          {word}
          <Text style={GlobalStyle.marqueeStar}>{'  ✳  '}</Text>
        </Text>
      ))}
    </Text>
  );

  return (
    <View style={GlobalStyle.marquee} accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View style={[GlobalStyle.marqueeTrack, { transform: [{ translateX: offset }] }]}>
        {Array.from({ length: COPIES }, (_, index) => copy(index))}
      </Animated.View>
    </View>
  );
}
