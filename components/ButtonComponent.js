import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { brand } from '../styles/GlobalStyle';
import RonnieMascot from './RonnieMascot';

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
export default function ButtonComponent({
  title,
  type = 'secondary',
  onPress,
  disabled = false,
  size,
  full = false,
  icon,
  ronnie = false,
}) {
  const [buttonStyle, textStyle] = BUTTON_STYLES[type] ?? BUTTON_STYLES.secondary;
  const small = size === 'small';
  // Den primære knap har en svag gradient.
  const gradient = type === 'primary' ? brand.buttonGradient : null;
  const textColor = GlobalStyle[textStyle].color;

  return (
    <Pressable
      style={({ pressed }) => [
        GlobalStyle[buttonStyle],
        small && type !== 'text' && GlobalStyle.buttonSmall,
        full && GlobalStyle.buttonFull,
        disabled && GlobalStyle.buttonDisabled,
        pressed && GlobalStyle.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {gradient && (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={GlobalStyle.buttonGradient}
        />
      )}
      <View style={GlobalStyle.buttonContent}>
        {ronnie && <RonnieMascot size="tiny" />}
        {icon && <Ionicons name={icon} size={small ? 15 : 17} color={textColor} />}
        <Text style={[GlobalStyle[textStyle], small && GlobalStyle.buttonTextSmall]}>{title}</Text>
      </View>
    </Pressable>
  );
}
