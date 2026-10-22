// Ansvarlig: Jakob
import { useContext } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import AccountForm from '../components/AccountForm';
import RonnieMascot from '../components/RonnieMascot';
import { UserContext } from '../data/UserContext';

// Log ind på en eksisterende konto, fx på en ny telefon. Nås fra velkomsten i onboarding og fra
// Profil. Når login lykkes, skifter appen selv til kontoens profil; er onboarding gennemført på
// kontoen, springes den over, og Find vises.
export default function LoginScreen() {
  const { logIn } = useContext(UserContext);

  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['bottom']}>
      <KeyboardAvoidingView
        style={GlobalStyle.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={GlobalStyle.stepContent}
          keyboardShouldPersistTaps="handled"
        >
          <RonnieMascot size="small" />
          <Text style={GlobalStyle.title}>Velkommen tilbage</Text>
          <Text style={GlobalStyle.stepIntro}>
            Log ind med den e-mail og adgangskode, du gemte din profil med. Så får du dine
            oplysninger, Favoritter og Prisalarmer tilbage. Det, du har udfyldt på denne telefon
            uden konto, bliver erstattet af din konto.
          </Text>
          <AccountForm mode="login" onSubmit={logIn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
