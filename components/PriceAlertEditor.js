import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import { TRY_AGAIN_MESSAGE } from '../data/errors';
import { describePriceAlert, parseThreshold, thresholdText } from '../data/priceAlerts';

const FIELD_LABELS = {
  favorite: 'Sig til, når prisen falder mindst (kr/md):',
  currentMembership: 'Sig til, når et Tilbud er mindst så meget billigere (kr/md):',
};

// Prisalarm på en Favorit eller på Nuværende medlemskab (kind = 'favorite' | 'currentMembership'):
// slå til med en valgfri tærskel (forudfyldt 50 kr/md, tomt felt = ethvert fald), ret tærsklen
// eller slå fra. onSave(thresholdPerMonth | null) og onDisable() gemmer og må afvise ved fejl.
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
      <View style={GlobalStyle.detailsBox}>
        <Text style={GlobalStyle.fieldLabel}>{FIELD_LABELS[kind]}</Text>
        <TextInput
          style={GlobalStyle.input}
          value={text}
          onChangeText={setText}
          placeholder="Ethvert fald"
          keyboardType="decimal-pad"
          accessibilityLabel="Tærskel i kr pr. måned"
        />
        {error && <Text style={GlobalStyle.errorText}>{error}</Text>}
        <Text style={GlobalStyle.noticeText}>Lad feltet stå tomt for besked ved ethvert fald.</Text>
        <View style={GlobalStyle.sortRow}>
          <ButtonComponent title="Gem" type="primary" onPress={handleSave} disabled={saving} />
          <ButtonComponent title="Annuller" onPress={() => setEditing(false)} disabled={saving} />
        </View>
      </View>
    );
  }

  if (!priceAlert) {
    return (
      <View style={GlobalStyle.sortRow}>
        <ButtonComponent title="Slå Prisalarm til" onPress={startEditing} />
      </View>
    );
  }

  return (
    <View style={GlobalStyle.detailsBox}>
      <Text style={GlobalStyle.infoTitle}>Prisalarm er slået til</Text>
      <Text style={GlobalStyle.stepIntro}>{describePriceAlert(priceAlert, kind)}</Text>
      <View style={GlobalStyle.sortRow}>
        <ButtonComponent title="Ret tærskel" onPress={startEditing} />
        <ButtonComponent title="Slå fra" onPress={handleDisable} />
      </View>
    </View>
  );
}
