import { Switch, Text, View } from 'react-native';

import GlobalStyle, { colors } from '../styles/GlobalStyle';

// En række med tekst og en kontakt, som i telefonens Indstillinger. Bruges i en gruppe
// (GlobalStyle.group). right kan fx være en ⓘ ved siden af teksten.
export default function ToggleRow({ label, description, value, onChange, right }) {
  return (
    <View style={GlobalStyle.toggleRow}>
      <View style={GlobalStyle.toggleText}>
        <View style={GlobalStyle.inlineRow}>
          <Text style={GlobalStyle.toggleLabel}>{label}</Text>
          {right}
        </View>
        {Boolean(description) && <Text style={GlobalStyle.toggleDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.ink, false: colors.surfaceRaised }}
        thumbColor={colors.surface}
        activeThumbColor={colors.accent}
        ios_backgroundColor={colors.surfaceRaised}
        accessibilityLabel={label}
      />
    </View>
  );
}
