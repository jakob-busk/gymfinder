import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

import GlobalStyle, { brand, motion } from '../styles/GlobalStyle';

// Ronnies positurer. Indtil videre findes kun tommel op; de andre falder tilbage til den.
// Positurer, der bruges i appen: vinker (Velkomst), peger (Adresse, tomme Favoritter),
// tænker (Rabatprofil), jubler (Afslut onboarding, prisfald), sveder/løfter (Find henter) og
// trækker på skuldrene (ingen resultater, Ronnie holder fri).
const POSES = {
  'tommel op': require('../assets/ronnie.png'),
};

// Billedet og den farvede cirkel bag Ronnie pr. størrelse. Avataren er selv en farvet cirkel.
// Mini (i knapper) har ingen cirkel, så den ikke slås med knappens farve.
const SIZES = {
  large: { image: 'ronnieLarge', stage: 'ronnieLargeStage', circle: 'ronnieLargeCircle' },
  small: { image: 'ronnieSmall', stage: 'ronnieSmallStage', circle: 'ronnieSmallCircle' },
  hint: { image: 'ronnieHintImage', stage: 'ronnieHintStage', circle: 'ronnieHintCircle' },
  avatar: { image: 'ronnieTiny', stage: 'ronnieAvatarStage' },
  tiny: { image: 'ronnieTiny' },
};

// Ronnie dukker op med et lille fjeder-hop, og i de store størrelser vipper han roligt op og ned,
// så han føles levende. Slår brugeren "reducer bevægelse" til, står han stille efter hoppet.
function useRonnieMotion(bob) {
  const pop = useRef(new Animated.Value(0.85)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop;
    let cancelled = false;
    Animated.spring(pop, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: motion.native,
    }).start();

    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled || reduceMotion || !bob) return;
        const step = (toValue) =>
          Animated.timing(lift, {
            toValue,
            duration: 900,
            easing: motion.easeInOut,
            useNativeDriver: motion.native,
          });
        loop = Animated.loop(Animated.sequence([step(-6), step(0), Animated.delay(900)]));
        loop.start();
      });

    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [bob, lift, pop]);

  return { transform: [{ translateY: lift }, { scale: pop }] };
}

// Ronnie, GymFinders maskot, på en farvet cirkel, der følger hans positur (se brand.ronnieTones).
// size er 'large' (Velkomst, afslutning), 'small' (tomme tilstande, Spørg Ronnie), 'hint' (ved en
// taleboble), 'avatar' (ved Ronnies beskeder i chatten) eller 'tiny' (i knapper). pose er den
// positur, der passer til stedet (se POSES). style flytter ham, fx ud til højre på Velkomst.
// Ronnie er kun med ved godt nyt, aldrig ved priser, advarsler, fejl eller login.
export default function RonnieMascot({ size = 'large', pose = 'tommel op', style }) {
  const parts = SIZES[size] ?? SIZES.large;
  const centered = size === 'large' || size === 'small';
  const tone = brand.ronnieTones[pose] ?? brand.ronnieTones['tommel op'];
  const ronnieMotion = useRonnieMotion(centered);

  const image = (
    <Animated.Image
      source={POSES[pose] ?? POSES['tommel op']}
      style={[GlobalStyle[parts.image], ronnieMotion]}
      resizeMode="contain"
      accessibilityLabel="Ronnie, GymFinders maskot"
    />
  );

  if (!parts.stage) return image;

  return (
    <View
      style={[
        GlobalStyle[parts.stage],
        !parts.circle && { backgroundColor: tone },
        centered && GlobalStyle.centeredSelf,
        style,
      ]}
    >
      {parts.circle && <View style={[GlobalStyle[parts.circle], { backgroundColor: tone }]} />}
      {image}
    </View>
  );
}
