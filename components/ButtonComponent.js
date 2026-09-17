import { Pressable, Text } from 'react-native';
import GlobalStyle from '../styles/GlobalStyle';

// type: 'primary' | 'secondary'
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
