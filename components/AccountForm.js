import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import { accountErrorMessage, validateAccountForm } from '../data/account';

// Formular til "Opret konto" (mode 'create': navn, e-mail og adgangskode) eller "Log ind"
// (mode 'login': e-mail og adgangskode). onSubmit({ name, email, password }) kaldes med de
// rensede værdier; kaster den en fejl, vises den på dansk under felterne. onFilledChange(true/false)
// fortæller, om brugeren har skrevet noget i felterne. submitType er knappens type.
export default function AccountForm({
  mode = 'create',
  submitLabel,
  submitType = 'primary',
  onSubmit,
  onFilledChange,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isCreate = mode === 'create';

  const filled = Boolean(name.trim() || email.trim() || password);
  useEffect(() => {
    onFilledChange?.(filled);
  }, [filled, onFilledChange]);

  const handleSubmit = async () => {
    const form = validateAccountForm({ name, email, password }, mode);
    if (form.error) {
      setError(form.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (submitError) {
      setError(accountErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {isCreate && (
        <>
          <Text style={GlobalStyle.fieldLabel}>Navn</Text>
          <TextInput
            style={GlobalStyle.input}
            value={name}
            onChangeText={setName}
            placeholder="Dit navn"
            placeholderTextColor={colors.muted}
            autoComplete="name"
            textContentType="name"
          />
        </>
      )}

      <Text style={GlobalStyle.fieldLabel}>E-mail</Text>
      <TextInput
        style={GlobalStyle.input}
        value={email}
        onChangeText={setEmail}
        placeholder="navn@eksempel.dk"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />

      <Text style={GlobalStyle.fieldLabel}>Adgangskode</Text>
      <TextInput
        style={GlobalStyle.input}
        value={password}
        onChangeText={setPassword}
        placeholder={isCreate ? 'Mindst 6 tegn' : 'Din adgangskode'}
        placeholderTextColor={colors.muted}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={isCreate ? 'new-password' : 'current-password'}
        textContentType={isCreate ? 'newPassword' : 'password'}
      />

      {error && <Text style={GlobalStyle.errorText}>{error}</Text>}

      <View style={GlobalStyle.accountActions}>
        {busy && <ActivityIndicator color={colors.text} />}
        <ButtonComponent
          title={submitLabel ?? (isCreate ? 'Opret konto' : 'Log ind')}
          type={submitType}
          onPress={handleSubmit}
          disabled={busy}
        />
      </View>
    </View>
  );
}
