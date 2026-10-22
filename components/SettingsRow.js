import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';

// En række i en gruppe, som i telefonens Indstillinger: ikon, navn, den nuværende værdi under og
// en pil. Hele rækken kan trykkes. Uden onPress vises ingen pil.
export default function SettingsRow({ icon, label, value, onPress, danger = false }) {
  return (
    <Pressable
      style={({ pressed }) => [GlobalStyle.settingsRow, pressed && GlobalStyle.buttonPressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
    >
      {icon && (
        <View style={GlobalStyle.settingsIcon}>
          <Ionicons name={icon} size={17} color={danger ? colors.error : colors.muted} />
        </View>
      )}
      <View style={GlobalStyle.settingsText}>
        <Text style={[GlobalStyle.settingsLabel, danger && GlobalStyle.settingsLabelDanger]}>
          {label}
        </Text>
        {Boolean(value) && (
          <Text style={GlobalStyle.settingsValue} numberOfLines={2}>
            {value}
          </Text>
        )}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />}
    </Pressable>
  );
}
