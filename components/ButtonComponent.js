import { Pressable, Text } from 'react-native';
import GlobalStyle from '../styles/GlobalStyle';

// Genbrugeligt knap komponenet. Bruges alle steder i appen hvor der er en knap (sortering, tilmelding, osv.)
export default function ButtonComponent({ title, type = 'secondary', onPress }) {
  const isPrimary = type === 'primary';

  return (
    <Pressable
      style={isPrimary ? GlobalStyle.buttonPrimary : GlobalStyle.buttonSecondary}
      onPress={onPress}
    >
      <Text style={isPrimary ? GlobalStyle.buttonTextPrimary : GlobalStyle.buttonTextSecondary}>
        {title}
      </Text>
    </Pressable>
  );
}
