import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';

export const ONBOARDING_STEP_COUNT = 6;

// Fælles ramme for et onboarding-trin: "Trin x af 6", titel, forklaring, indhold og knapper
// nederst. Valgfrie trin får "Spring over" (onSkip). nextDisabled spærrer "Næste", indtil de
// krævede oplysninger er udfyldt.
export default function OnboardingStep({
  step,
  title,
  intro,
  children,
  onNext,
  nextLabel = 'Næste',
  nextDisabled = false,
  onSkip,
}) {
  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['bottom']}>
      <KeyboardAvoidingView
        style={GlobalStyle.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={GlobalStyle.stepContent} keyboardShouldPersistTaps="handled">
          {step != null && (
            <Text style={GlobalStyle.stepCounter}>
              Trin {step} af {ONBOARDING_STEP_COUNT}
            </Text>
          )}
          <Text style={GlobalStyle.title}>{title}</Text>
          {intro && <Text style={GlobalStyle.stepIntro}>{intro}</Text>}
          {children}
        </ScrollView>

        <View style={GlobalStyle.stepFooter}>
          {onSkip && <ButtonComponent title="Spring over" onPress={onSkip} />}
          <ButtonComponent title={nextLabel} type="primary" onPress={onNext} disabled={nextDisabled} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
