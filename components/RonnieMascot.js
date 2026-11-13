import { useEffect, useRef } from 'react';
import { Animated, Image, View } from 'react-native';

import GlobalStyle, { motion } from '../styles/GlobalStyle';

// Ronnies positurer. Indtil videre findes kun tommel op; de andre falder tilbage til den.
// Positurer, der bruges i appen: vinker (Velkomst), peger (Adresse, tomme Favoritter),
// tænker (Rabatprofil), jubler (Afslut onboarding, prisfald), sveder/løfter (Find henter) og
// trækker på skuldrene (ingen resultater, Ronnie holder fri).
const POSES = {
  'tommel op': require('../assets/ronnie.png'),
};

const SIZES = {
  large: 'ronnieLarge',
  small: 'ronnieSmall',
  avatar: 'ronnieAvatar',
  tiny: 'ronnieTiny',
};

const DISCS = {
  large: 'ronnieDiscLarge',
  small: 'ronnieDiscSmall',
};

const BADGES = {
  avatar: 'ronnieBadgeAvatar',
  tiny: 'ronnieBadgeTiny',
};

// Den store Ronnie lever lidt: han vipper op og ned, og solen bag ham trækker vejret i et andet
// tempo, så bevægelsen aldrig ser mekanisk ud. Kun transform, så det koster næsten intet.
function useBreathing(active) {
  const bob = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return undefined;
    const wave = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: motion.easeInOut,
            useNativeDriver: motion.native,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: motion.easeInOut,
            useNativeDriver: motion.native,
          }),
        ]),
      );
    const loops = [wave(bob, 1600), wave(breath, 2300)];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [active, bob, breath]);

  return {
    ronnie: {
      transform: [
        { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
        { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) },
      ],
    },
    disc: {
      transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] }) }],
    },
  };
}

// Ronnie, GymFinders maskot, som et klistermærke på en limegrøn sol. size er 'large' (Velkomst,
// afslutning), 'small' (tomme tilstande, Spørg Ronnie), 'avatar' (ved Ronnies beskeder i chatten)
// eller 'tiny' (i knapper og hints). pose er den positur, der passer til stedet (se POSES).
// style flytter ham, fx skævt til højre på Velkomst.
// Ronnie er kun med ved godt nyt, aldrig ved priser, advarsler, fejl eller login.
export default function RonnieMascot({ size = 'large', pose = 'tommel op', style }) {
  const breathing = useBreathing(size === 'large');
  const image = (
    <Image
      source={POSES[pose] ?? POSES['tommel op']}
      style={GlobalStyle[SIZES[size]] ?? GlobalStyle.ronnieLarge}
      resizeMode="contain"
      accessibilityLabel="Ronnie, GymFinders maskot"
    />
  );

  // Små Ronnier sidder i en rund lime-ramme.
  if (BADGES[size]) {
    return <View style={[GlobalStyle.ronnieBadge, GlobalStyle[BADGES[size]], style]}>{image}</View>;
  }

  return (
    <View style={[GlobalStyle.ronnieStage, GlobalStyle.centeredSelf, style]}>
      <Animated.View
        style={[GlobalStyle.ronnieDisc, GlobalStyle[DISCS[size] ?? DISCS.large], breathing.disc]}
      />
      <Animated.View style={breathing.ronnie}>{image}</Animated.View>
    </View>
  );
}
