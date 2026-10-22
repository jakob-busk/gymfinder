import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import SegmentedControl from './SegmentedControl';
import SelectMenu from './SelectMenu';
import { parseMonthlyPrice } from '../data/userProfile';

// Nuværende medlemskab: brugerens egen månedspris og eventuelt hvilken Kæde, eller "Ingen".
// onChange får { monthlyPrice, chainId } eller null (Ingen). chains er Kæderne fra centerdata.
export default function CurrentMembershipEditor({ currentMembership, chains, onChange }) {
  const [hasMembership, setHasMembership] = useState(currentMembership != null);
  const [priceText, setPriceText] = useState(
    currentMembership ? String(currentMembership.monthlyPrice) : '',
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentMembership) return;
    setHasMembership(true);
    setPriceText(String(currentMembership.monthlyPrice));
  }, [currentMembership]);

  const chainId = currentMembership?.chainId ?? null;

  const handleNone = () => {
    setHasMembership(false);
    setPriceText('');
    setError(null);
    onChange(null);
  };

  const handlePriceChange = (text) => {
    setPriceText(text);
    const price = parseMonthlyPrice(text);
    // "249," er ikke en fejl endnu: brugeren er ved at skrive øre.
    const isTyping = !text.trim() || /[.,]$/.test(text.trim());
    setError(price == null && !isTyping ? 'Skriv månedsprisen i kr, fx 299.' : null);
    if (price != null) onChange({ monthlyPrice: price, chainId });
  };

  const handleChain = (id) => {
    const price = currentMembership?.monthlyPrice;
    if (price == null) {
      setError('Skriv først din månedspris.');
      return;
    }
    onChange({ monthlyPrice: price, chainId: id });
  };

  const handleChoice = (member) => {
    if (member) setHasMembership(true);
    else handleNone();
  };

  return (
    <View>
      <SegmentedControl
        options={[
          { value: false, label: 'Ingen' },
          { value: true, label: 'Jeg er medlem et sted' },
        ]}
        value={hasMembership}
        onChange={handleChoice}
      />

      {hasMembership && (
        <View>
          <Text style={GlobalStyle.fieldLabel}>Hvad betaler du om måneden? (kr)</Text>
          <TextInput
            style={GlobalStyle.input}
            value={priceText}
            onChangeText={handlePriceChange}
            placeholder="Fx 299"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            accessibilityLabel="Månedspris i kr"
          />
          {error && <Text style={GlobalStyle.errorText}>{error}</Text>}

          <Text style={GlobalStyle.fieldLabel}>Hos hvilken Kæde? (valgfrit)</Text>
          <SelectMenu
            title="Hos hvilken Kæde?"
            value={chainId}
            options={chains.map((chain) => ({ value: chain.id, label: chain.name }))}
            onChange={handleChain}
            placeholder="Vælg Kæde"
            allowNone
            full
          />
        </View>
      )}
    </View>
  );
}
