import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import SegmentedControl from './SegmentedControl';
import SelectMenu from './SelectMenu';
import { parseMonthlyPrice } from '../data/userProfile';

// Nuværende medlemskab: brugerens egen månedspris og eventuelt hvilken Kæde, eller "Ingen".
// onChange får { monthlyPrice, chainId } eller null (Ingen, eller intet gyldigt prisfelt).
// chains er Kæderne fra centerdata. onCompleteChange(true/false) fortæller, om valget er
// færdigt: "Ingen", eller "Jeg er medlem et sted" med en gyldig månedspris.
// Et tomt eller ugyldigt prisfelt nulstiller medlemskabet (onChange(null)), så en gammel pris
// aldrig bliver stående i stilhed; feltet siger selv, hvad der mangler.
export default function CurrentMembershipEditor({
  currentMembership,
  chains,
  onChange,
  onCompleteChange,
}) {
  const [hasMembership, setHasMembership] = useState(currentMembership != null);
  const [priceText, setPriceText] = useState(
    currentMembership ? String(currentMembership.monthlyPrice) : '',
  );
  // Kæden huskes her, så den ikke forsvinder, mens prisfeltet er tomt.
  const [chainId, setChainId] = useState(currentMembership?.chainId ?? null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentMembership) return;
    setHasMembership(true);
    setChainId(currentMembership.chainId ?? null);
    // Skriver kun over feltet, når prisen kommer udefra (fx efter login), ikke mens man skriver.
    setPriceText((text) =>
      parseMonthlyPrice(text) === currentMembership.monthlyPrice
        ? text
        : String(currentMembership.monthlyPrice),
    );
  }, [currentMembership]);

  const priceValid = parseMonthlyPrice(priceText) != null;
  const complete = !hasMembership || priceValid;
  useEffect(() => {
    onCompleteChange?.(complete);
  }, [complete, onCompleteChange]);

  const handleNone = () => {
    setHasMembership(false);
    setPriceText('');
    setChainId(null);
    setError(null);
    onChange(null);
  };

  const handlePriceChange = (text) => {
    setPriceText(text);
    const price = parseMonthlyPrice(text);
    const trimmed = text.trim();
    // "249," er ikke en fejl endnu: brugeren er ved at skrive øre. Prisen før kommaet gælder.
    if (price == null && /^\d+[.,]$/.test(trimmed)) {
      setError(null);
      return;
    }
    if (price != null) {
      setError(null);
      onChange({ monthlyPrice: price, chainId });
      return;
    }
    setError(
      trimmed
        ? 'Skriv månedsprisen i kr, fx 299. Indtil da gemmes intet medlemskab.'
        : 'Skriv din månedspris. Uden den gemmes intet medlemskab.',
    );
    onChange(null);
  };

  const handleChain = (id) => {
    setChainId(id);
    const price = parseMonthlyPrice(priceText);
    if (price != null) onChange({ monthlyPrice: price, chainId: id });
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
