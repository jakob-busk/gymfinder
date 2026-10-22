import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import { getCurrentPlace, searchAddresses } from '../services/Location';
import {
  ADDRESS_SEARCH_ERROR,
  NO_SUGGESTIONS_TEXT,
  SEARCH_DEBOUNCE_MS,
  isSearchable,
} from '../data/addressSearch';

// Adressefelt med forslag, mens brugeren skriver, og "Brug min placering" (GPS).
// Forslagene hentes efter en kort pause og først fra 3 tegn (se data/addressSearch.js).
// onChange({ address, location }) kaldes, når brugeren vælger et forslag eller bruger sin
// placering. Retter brugeren teksten væk fra den fundne adresse, kaldes onChange(null), så
// skærmen kan spærre "Næste", indtil en ny adresse er valgt.
export default function AddressField({ address, location, onChange }) {
  const [text, setText] = useState(address ?? '');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  // Tæller op ved "Prøv igen", så samme tekst søges igen.
  const [searchRound, setSearchRound] = useState(0);
  // Den adresse, feltet selv har meldt til skærmen. Kun en ny adresse udefra (fx efter login)
  // skriver over det, brugeren er i gang med.
  const reportedAddress = useRef(address ?? '');
  // Der søges kun på tekst, brugeren selv har skrevet, ikke på en valgt adresse.
  const typed = useRef(false);

  useEffect(() => {
    const next = address ?? '';
    if (next === reportedAddress.current) return;
    reportedAddress.current = next;
    typed.current = false;
    setText(next);
    setSuggestions([]);
  }, [address]);

  // Teksten i feltet er den adresse, der allerede er fundet.
  const isConfirmed =
    location != null && text.trim() !== '' && text.trim() === (address ?? '').trim();

  useEffect(() => {
    if (!typed.current || !isSearchable(text)) {
      setSuggestions([]);
      setSearching(false);
      setNotice(null);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      setNotice(null);
      try {
        const found = await searchAddresses(text, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setSuggestions(found);
        if (found.length === 0) setNotice(NO_SUGGESTIONS_TEXT);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        console.warn('Adresseforslag fejlede:', searchError);
        setSuggestions([]);
        setError(ADDRESS_SEARCH_ERROR);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, searchRound]);

  const handleChangeText = (value) => {
    typed.current = true;
    setText(value);
    setError(null);
    // En ny tekst er ikke en fundet adresse. Den gamle må ikke gælde, mens brugeren retter.
    if (location != null && value.trim() !== (address ?? '').trim()) {
      reportedAddress.current = '';
      onChange(null);
    }
  };

  const handleSelect = (suggestion) => {
    typed.current = false;
    reportedAddress.current = suggestion.address;
    setText(suggestion.address);
    setSuggestions([]);
    setError(null);
    setNotice(null);
    Keyboard.dismiss();
    onChange(suggestion);
  };

  const handleRetry = () => {
    typed.current = true;
    setError(null);
    setSearchRound((round) => round + 1);
  };

  const handleUseMyLocation = async () => {
    setLocating(true);
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
      handleSelect({ address: place.address || 'Min placering', location: place.location });
    } catch (locationError) {
      console.error('Hent placering fejlede:', locationError);
      setError('Din placering kunne ikke findes. Skriv din adresse i stedet.');
    } finally {
      setLocating(false);
    }
  };

  const busy = searching || locating;
  const showOldAddress = !isConfirmed && location != null && Boolean(address);
  const showPickHint = !isConfirmed && suggestions.length > 0;

  return (
    <View>
      <TextInput
        style={GlobalStyle.input}
        value={text}
        onChangeText={handleChangeText}
        onSubmitEditing={handleRetry}
        placeholder="Fx Østerbrogade 79, 2100 København Ø"
        placeholderTextColor={colors.muted}
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Adresse"
      />

      {suggestions.length > 0 && (
        <View style={GlobalStyle.addressSuggestions} accessibilityRole="list">
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.address}
              style={GlobalStyle.addressSuggestion}
              onPress={() => handleSelect(suggestion)}
              accessibilityRole="button"
            >
              <Text style={GlobalStyle.addressSuggestionText}>{suggestion.address}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {showPickHint && <Text style={GlobalStyle.noticeText}>Vælg din adresse på listen.</Text>}
      {notice && !error && <Text style={GlobalStyle.noticeText}>{notice}</Text>}
      {error && <Text style={GlobalStyle.errorText}>{error}</Text>}
      {isConfirmed && !error && (
        <Text style={GlobalStyle.confirmedText}>Afstande regnes fra: {address}</Text>
      )}
      {showOldAddress && !error && (
        <Text style={GlobalStyle.noticeText}>
          Indtil du vælger en ny adresse, regnes afstande stadig fra: {address}
        </Text>
      )}

      <View style={GlobalStyle.sortRow}>
        {error && <ButtonComponent title="Prøv igen" type="primary" onPress={handleRetry} />}
        <ButtonComponent
          title="Brug min placering"
          type="ghost"
          icon="locate-outline"
          onPress={handleUseMyLocation}
          disabled={busy}
        />
        {busy && <ActivityIndicator />}
      </View>
    </View>
  );
}
