import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import { formatBirthDate, parseBirthDate } from '../data/userProfile';

// Fødselsdato som DD-MM-ÅÅÅÅ. onChange kaldes kun med en gyldig dato ('YYYY-MM-DD'),
// så Aldersgruppen i Matchning aldrig regnes ud fra en halvt skrevet dato.
export default function BirthDateField({ birthDate, onChange }) {
  const [text, setText] = useState(formatBirthDate(birthDate));
  const [error, setError] = useState(null);

  useEffect(() => {
    setText(formatBirthDate(birthDate));
  }, [birthDate]);

  const handleChange = (value) => {
    setText(value);
    const result = parseBirthDate(value);
    // Fejl vises først, når datoen er skrevet færdig (DD-MM-ÅÅÅÅ er 10 tegn).
    setError(result.error && value.trim().length >= 10 ? result.error : null);
    if (result.birthDate && result.birthDate !== birthDate) onChange(result.birthDate);
  };

  const handleBlur = () => {
    const result = parseBirthDate(text);
    setError(result.error ?? null);
  };

  return (
    <View>
      <TextInput
        style={GlobalStyle.input}
        value={text}
        onChangeText={handleChange}
        onBlur={handleBlur}
        placeholder="DD-MM-ÅÅÅÅ"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        accessibilityLabel="Fødselsdato"
      />
      {error && <Text style={GlobalStyle.errorText}>{error}</Text>}
    </View>
  );
}
