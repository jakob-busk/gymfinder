import { Pressable, Text } from 'react-native';
import GlobalStyle from '../styles/GlobalStyle';

// Genbrugeligt knap komponenet. Bruges alle steder i appen hvor der er en knap (sortering, tilmelding, osv.)
// disabled gør knappen grå og utrykbar (fx mens en adresse slås op).
export default function ButtonComponent({ title, type = 'secondary', onPress, disabled = false }) {
  const isPrimary = type === 'primary';

  return (
    <Pressable
      style={[
        isPrimary ? GlobalStyle.buttonPrimary : GlobalStyle.buttonSecondary,
        disabled && GlobalStyle.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={isPrimary ? GlobalStyle.buttonTextPrimary : GlobalStyle.buttonTextSecondary}>
        {title}
      </Text>
    </Pressable>
  );
}
