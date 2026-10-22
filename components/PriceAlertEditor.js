import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import ToggleRow from './ToggleRow';
import { TRY_AGAIN_MESSAGE } from '../data/errors';
import { describePriceAlert, parseThreshold, thresholdText } from '../data/priceAlerts';

const OFF_DESCRIPTIONS = {
  favorite: 'Få besked, når prisen falder.',
  currentMembership: 'Få besked, når et Tilbud er billigere end dit medlemskab.',
};

const FIELD_LABELS = {
  favorite: 'Sig til, når prisen falder mindst (kr/md):',
  currentMembership: 'Sig til, når et Tilbud er mindst så meget billigere (kr/md):',
};

// Prisalarm på en Favorit eller på Nuværende medlemskab (kind = 'favorite' | 'currentMembership'):
// slå til med en valgfri tærskel (forudfyldt 50 kr/md, tomt felt = ethvert fald), ret tærsklen
// eller slå fra. Vises som en kontakt nederst i kortet. onSave(thresholdPerMonth | null) og onDisable() gemmer og må afvise ved fejl.
export default function PriceAlertEditor({ priceAlert, kind = 'favorite', onSave, onDisable }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setText(thresholdText(priceAlert));
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    const result = parseThreshold(text);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaving(true);
    try {
      await onSave(result.thresholdPerMonth);
      setEditing(false);
    } catch (saveError) {
      console.error('Gem Prisalarm fejlede:', saveError);
      Alert.alert('Kunne ikke gemme Prisalarm', TRY_AGAIN_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    try {
      await onDisable();
    } catch (disableError) {
      console.error('Slå Prisalarm fra fejlede:', disableError);
      Alert.alert('Kunne ikke slå Prisalarm fra', TRY_AGAIN_MESSAGE);
    }
  };

  if (editing) {
    return (
      <View style={[GlobalStyle.cardSection, GlobalStyle.groupPadded]}>
        <Text style={GlobalStyle.fieldLabel}>{FIELD_LABELS[kind]}</Text>
        <TextInput
          style={GlobalStyle.input}
          value={text}
          onChangeText={setText}
          placeholder="Ethvert fald"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          accessibilityLabel="Tærskel i kr pr. måned"
        />
        {error && <Text style={GlobalStyle.errorText}>{error}</Text>}
        <Text style={GlobalStyle.mutedText}>Lad feltet stå tomt for besked ved ethvert fald.</Text>
        <View style={GlobalStyle.accountActions}>
          <ButtonComponent
            title="Annuller"
            type="text"
            onPress={() => setEditing(false)}
            disabled={saving}
          />
          <ButtonComponent
            title="Gem Prisalarm"
            type="primary"
            size="small"
            onPress={handleSave}
            disabled={saving}
          />
        </View>
      </View>
    );
  }

  // Slået fra: en kontakt. Slås den til, kan tærsklen vælges først.
  if (!priceAlert) {
    return (
      <View style={GlobalStyle.cardSection}>
        <ToggleRow
          label="Prisalarm"
          description={OFF_DESCRIPTIONS[kind]}
          value={false}
          onChange={startEditing}
        />
      </View>
    );
  }

  return (
    <View style={GlobalStyle.cardSection}>
      <ToggleRow
        label="Prisalarm"
        description={describePriceAlert(priceAlert, kind)}
        value
        onChange={handleDisable}
      />
      <View style={GlobalStyle.cardSectionAction}>
        <ButtonComponent title="Ret tærskel" type="text" size="small" onPress={startEditing} />
      </View>
    </View>
  );
}
