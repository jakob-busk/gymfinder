import { Image, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';

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

// Ronnie, GymFinders maskot, med neon-glød. size er 'large' (Velkomst, afslutning), 'small'
// (tomme tilstande, Spørg Ronnie), 'avatar' (ved Ronnies beskeder i chatten) eller 'tiny' (i
// knapper og hints). pose er den positur, der passer til stedet (se POSES).
// Ronnie er kun med ved godt nyt, aldrig ved priser, advarsler, fejl eller login.
export default function RonnieMascot({ size = 'large', pose = 'tommel op' }) {
  const centered = size === 'large' || size === 'small';
  return (
    <View style={[GlobalStyle.ronnieGlow, centered && GlobalStyle.centeredSelf]}>
      <Image
        source={POSES[pose] ?? POSES['tommel op']}
        style={GlobalStyle[SIZES[size]] ?? GlobalStyle.ronnieLarge}
        resizeMode="contain"
        accessibilityLabel="Ronnie, GymFinders maskot"
      />
    </View>
  );
}
