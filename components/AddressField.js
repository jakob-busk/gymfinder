import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import { geocodeAddress, getCurrentPlace } from '../services/Location';

// Adressefelt med "Find adresse" (geokodning) og "Brug min placering" (GPS).
// onChange kaldes først, når adressen er fundet: onChange({ address, location }).
// Indtil da beholdes den gamle adresse, så Distance aldrig regnes fra en halv adresse.
export default function AddressField({ address, location, onChange }) {
  const [text, setText] = useState(address ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setText(address ?? '');
  }, [address]);

  // Teksten i feltet er den adresse, der allerede er fundet.
  const isConfirmed =
    location != null && text.trim() !== '' && text.trim() === (address ?? '').trim();

  const handleFindAddress = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Udfyld adresse.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const found = await geocodeAddress(trimmed);
      if (!found) {
        setError('Adressen kunne ikke findes. Tjek stavningen, og skriv gerne postnummer og by.');
        return;
      }
      onChange({ address: trimmed, location: found });
    } catch (geocodeError) {
      console.error('Geokodning fejlede:', geocodeError);
      setError('Adressen kunne ikke slås op lige nu. Prøv igen om lidt.');
    } finally {
      setBusy(false);
    }
  };

  const handleUseMyLocation = async () => {
    setBusy(true);
    setError(null);
    try {
      const place = await getCurrentPlace();
      if (!place) {
        Alert.alert(
          'Ingen adgang til placering',
          'Det er helt i orden. Skriv din adresse i feltet i stedet, så regner vi afstande ud ' +
            'fra den.',
        );
        return;
      }
      onChange({ address: place.address || 'Min placering', location: place.location });
    } catch (locationError) {
      console.error('Hent placering fejlede:', locationError);
      setError('Din placering kunne ikke findes. Skriv din adresse i stedet.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <TextInput
        style={GlobalStyle.input}
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleFindAddress}
        placeholder="Fx Østerbrogade 79, 2100 København Ø"
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        returnKeyType="search"
        accessibilityLabel="Adresse"
      />
      {error && <Text style={GlobalStyle.errorText}>{error}</Text>}
      {isConfirmed && !error && (
        <Text style={GlobalStyle.confirmedText}>Afstande regnes fra: {address}</Text>
      )}
      <View style={GlobalStyle.sortRow}>
        <ButtonComponent
          title="Find adresse"
          type="primary"
          onPress={handleFindAddress}
          disabled={busy}
        />
        <ButtonComponent title="Brug min placering" onPress={handleUseMyLocation} disabled={busy} />
        {busy && <ActivityIndicator />}
      </View>
    </View>
  );
}
