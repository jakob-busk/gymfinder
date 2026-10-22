import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';

// Et mærke, man slår til og fra, fx en maskine i Filtre. Valgt får et flueben og en tynd ramme.
export default function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      style={[GlobalStyle.chip, selected && GlobalStyle.chipSelected]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      {selected && <Ionicons name="checkmark" size={15} color={colors.primary} />}
      <Text style={[GlobalStyle.chipText, selected && GlobalStyle.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}
