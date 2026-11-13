import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle from '../styles/GlobalStyle';
import RonnieMascot from './RonnieMascot';
import { usePressScale } from './usePressScale';

const BUTTON_STYLES = {
  primary: ['buttonPrimary', 'buttonTextPrimary'],
  secondary: ['buttonSecondary', 'buttonTextSecondary'],
  // Ligner et link: til "Annuller", "Nulstil" og lignende, så de ikke fylder som knapper.
  text: ['buttonText', 'buttonTextText'],
  // Diskret knap i toppen af en skærm eller oven på kortet.
  ghost: ['buttonGhost', 'buttonTextGhost'],
};

// Genbrugeligt knap komponenet. Bruges alle steder i appen hvor der er en knap (sortering, tilmelding, osv.)
// disabled gør knappen grå og utrykbar (fx mens en adresse slås op).
// size 'small' bruges i kort og rækker; full fylder hele bredden. icon er et Ionicons-navn.
// ronnie viser en lille Ronnie foran teksten (fx "Spørg Ronnie om dette center").
// onInk bruges i den mørke blok (det Anbefalede Center), så tekst- og ghost-knapper kan ses.
// Knappen trykkes en anelse ind og fjedrer tilbage, så den føles fysisk.
export default function ButtonComponent({
  title,
  type = 'secondary',
  onPress,
  disabled = false,
  size,
  full = false,
  icon,
  ronnie = false,
  onInk = false,
}) {
  const [buttonStyle, textStyle] = BUTTON_STYLES[type] ?? BUTTON_STYLES.secondary;
  const small = size === 'small';
  const inverted = onInk && type !== 'primary';
  const { scaleStyle, onPressIn, onPressOut } = usePressScale();
  const textColor = inverted ? GlobalStyle.buttonTextOnInk.color : GlobalStyle[textStyle].color;

  return (
    <Animated.View style={[full && GlobalStyle.buttonFull, !disabled && scaleStyle]}>
      <Pressable
        style={({ pressed }) => [
          GlobalStyle[buttonStyle],
          small && type !== 'text' && GlobalStyle.buttonSmall,
          inverted && type !== 'text' && GlobalStyle.buttonOnInk,
          disabled && GlobalStyle.buttonDisabled,
          pressed && GlobalStyle.buttonPressed,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <View style={GlobalStyle.buttonContent}>
          {ronnie && <RonnieMascot size="tiny" />}
          {icon && <Ionicons name={icon} size={small ? 15 : 17} color={textColor} />}
          <Text
            style={[
              GlobalStyle[textStyle],
              small && GlobalStyle.buttonTextSmall,
              inverted && GlobalStyle.buttonTextOnInk,
            ]}
          >
            {title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
