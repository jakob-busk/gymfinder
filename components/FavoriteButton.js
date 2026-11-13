import { useContext, useRef } from 'react';
import { Alert, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors, motion } from '../styles/GlobalStyle';
import { TRY_AGAIN_MESSAGE } from '../data/errors';
import { useReduceMotion } from './useReduceMotion';
import { favoritePrice } from '../data/favorites';
import { UserContext } from '../data/UserContext';

// ♥ på et Center: gør Centret til Favorit eller fjerner det igen. Ved ♥ gemmes brugerens
// aktuelle Ærlig årspris for Centret, så et senere prisfald kan måles mod den.
// Hjertet sidder i en rund knap og slår et lille slag, når det trykkes. onInk bruges i den mørke
// blok (det Anbefalede Center).
export default function FavoriteButton({ center, chain, onInk = false }) {
  const { user, favorites } = useContext(UserContext);
  const active = favorites.isFavorite(center.id);
  const beat = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  const handlePress = async () => {
    // Hjertet slår et slag, undtagen ved "reducer bevægelse".
    if (!reduceMotion) {
      beat.setValue(0.7);
      Animated.spring(beat, {
        toValue: 1,
        speed: 14,
        bounciness: 16,
        useNativeDriver: motion.native,
      }).start();
    }
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
      hitSlop={6}
      style={[GlobalStyle.favoriteButton, onInk && GlobalStyle.favoriteButtonOnInk]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? 'Fjern fra Favoritter' : 'Gem som Favorit'}
    >
      <Animated.View style={{ transform: [{ scale: beat }] }}>
        <Ionicons name={active ? 'heart' : 'heart-outline'} size={21} color={colors.favorite} />
      </Animated.View>
    </Pressable>
  );
}
