import { Image } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';

const RONNIE = require('../assets/ronnie.png');

const SIZES = {
  large: GlobalStyle.ronnieLarge,
  small: GlobalStyle.ronnieSmall,
  avatar: GlobalStyle.ronnieAvatar,
};

// Ronnie, GymFinders maskot. size er 'large' (velkomst), 'small' (tomme tilstande, Spørg
// Ronnie) eller 'avatar' (ved Ronnies beskeder i chatten).
export default function RonnieMascot({ size = 'large' }) {
  return (
    <Image
      source={RONNIE}
      style={SIZES[size] ?? GlobalStyle.ronnieLarge}
      resizeMode="contain"
      accessibilityLabel="Ronnie, GymFinders maskot"
    />
  );
}
