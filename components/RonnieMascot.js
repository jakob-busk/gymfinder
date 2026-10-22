import { Image } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';

const RONNIE = require('../assets/ronnie.png');

// Ronnie, GymFinders maskot. size er 'large' (velkomst, Spørg Ronnie)
// eller 'small' (tomme tilstande).
export default function RonnieMascot({ size = 'large' }) {
  return (
    <Image
      source={RONNIE}
      style={size === 'small' ? GlobalStyle.ronnieSmall : GlobalStyle.ronnieLarge}
      resizeMode="contain"
      accessibilityLabel="Ronnie, GymFinders maskot"
    />
  );
}
