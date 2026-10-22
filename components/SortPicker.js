import { View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import { SORT_OPTIONS } from '../data/matchning';

// Række med en knap pr. sortering. Den valgte sortering (sortBy) er fremhævet.
export default function SortPicker({ sortBy, onChange }) {
  return (
    <View style={GlobalStyle.sortRow}>
      {SORT_OPTIONS.map((option) => (
        <ButtonComponent
          key={option.id}
          title={option.label}
          type={sortBy === option.id ? 'primary' : 'secondary'}
          onPress={() => onChange(option.id)}
        />
      ))}
    </View>
  );
}
