import { useContext } from 'react';
import { Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import { TRY_AGAIN_MESSAGE } from '../data/errors';
import { favoritePrice } from '../data/favorites';
import { UserContext } from '../data/UserContext';

// ♥ på et Center: gør Centret til Favorit eller fjerner det igen. Ved ♥ gemmes brugerens
// aktuelle Ærlig årspris for Centret, så et senere prisfald kan måles mod den.
export default function FavoriteButton({ center, chain }) {
  const { user, favorites } = useContext(UserContext);
  const active = favorites.isFavorite(center.id);

  const handlePress = async () => {
    const price = favoritePrice({
      center,
      chains: chain ? [chain] : [],
      user,
      today: new Date(),
    });
    try {
      await favorites.toggleFavorite(center.id, price);
    } catch (error) {
      console.error('Gem Favorit fejlede:', error);
      Alert.alert('Kunne ikke gemme Favorit', TRY_AGAIN_MESSAGE);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={GlobalStyle.favoriteButton}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? 'Fjern fra Favoritter' : 'Gem som Favorit'}
    >
      <Ionicons name={active ? 'heart' : 'heart-outline'} size={26} color={colors.favorite} />
    </Pressable>
  );
}
