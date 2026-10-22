import { useEffect, useRef, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import {
  birthDateLimits,
  birthDateToDate,
  dateToBirthDate,
  formatBirthDate,
  parseBirthDate,
} from '../data/userProfile';

// Fødselsdato: vælges i en kalender (datovælger) eller skrives som DD-MM-ÅÅÅÅ.
// onChange('YYYY-MM-DD') kaldes med en gyldig dato. Rettes datoen til noget ugyldigt eller
// halvt skrevet, kaldes onChange(null), så Aldersgruppen aldrig regnes ud fra en gammel dato,
// og skærmen kan spærre "Næste". Datovælgeren tillader kun datoer, hvor brugeren er 15-120 år.
export default function BirthDateField({ birthDate, onChange }) {
  const [text, setText] = useState(formatBirthDate(birthDate));
  const [error, setError] = useState(null);
  // Datovælgeren på iPhone ligger i skærmen og vises kun, når brugeren har bedt om den.
  const [showIosPicker, setShowIosPicker] = useState(false);
  // Den dato, feltet selv har meldt til skærmen. Kun en ny dato udefra (fx efter login)
  // skriver over det, brugeren er i gang med.
  const reportedBirthDate = useRef(birthDate ?? null);

  useEffect(() => {
    const next = birthDate ?? null;
    if (next === reportedBirthDate.current) return;
    reportedBirthDate.current = next;
    setText(formatBirthDate(next));
    setError(null);
  }, [birthDate]);

  const report = (value) => {
    reportedBirthDate.current = value;
    if (value !== (birthDate ?? null)) onChange(value);
  };

  const handleChangeText = (value) => {
    setText(value);
    const result = parseBirthDate(value);
    // Fejl vises først, når datoen er skrevet færdig (DD-MM-ÅÅÅÅ er 10 tegn).
    setError(result.error && value.trim().length >= 10 ? result.error : null);
    report(result.birthDate ?? null);
  };

  const handleBlur = () => {
    const result = parseBirthDate(text);
    setError(result.error ?? null);
  };

  const handlePickedDate = (date) => {
    const picked = dateToBirthDate(date);
    setText(formatBirthDate(picked));
    setError(null);
    report(picked);
  };

  const { minimumDate, maximumDate } = birthDateLimits();
  const pickerValue = birthDateToDate(birthDate);

  const handleOpenPicker = () => {
    if (Platform.OS === 'android') {
      // Android viser datovælgeren som en dialog med OK og Annuller.
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) handlePickedDate(date);
        },
      });
      return;
    }
    // "Færdig" uden at have drejet på hjulene vælger den dato, der står i datovælgeren.
    if (showIosPicker && !birthDate) handlePickedDate(pickerValue);
    setShowIosPicker(!showIosPicker);
  };

  return (
    <View>
      <TextInput
        style={GlobalStyle.input}
        value={text}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        placeholder="DD-MM-ÅÅÅÅ"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        accessibilityLabel="Fødselsdato"
      />
      {error && <Text style={GlobalStyle.errorText}>{error}</Text>}
      {birthDate && parseBirthDate(text).birthDate !== birthDate && (
        <Text style={GlobalStyle.noticeText}>
          Indtil datoen er gyldig, bruges stadig: {formatBirthDate(birthDate)}
        </Text>
      )}

      <View style={GlobalStyle.sortRow}>
        <ButtonComponent
          title={showIosPicker ? 'Færdig' : 'Vælg i kalender'}
          type={showIosPicker ? 'primary' : 'secondary'}
          onPress={handleOpenPicker}
        />
      </View>

      {Platform.OS === 'ios' && showIosPicker && (
        <View style={GlobalStyle.datePickerBox}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="spinner"
            locale="da-DK"
            themeVariant="light"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event, date) => {
              if (event.type === 'set' && date) handlePickedDate(date);
            }}
          />
        </View>
      )}
    </View>
  );
}
