import { useEffect, useRef } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle, { motion } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import Reveal from './Reveal';

export const ONBOARDING_STEP_COUNT = 6;

// Fremdrift som seks små streger. Tidligere trin står fyldt, og stregen for det aktuelle trin
// fyldes op fra venstre, når trinnet åbnes, så man mærker at man er kommet et skridt videre.
function StepProgress({ step }) {
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: 1,
      duration: motion.large,
      delay: 120,
      easing: motion.easeOut,
      useNativeDriver: motion.native,
    }).start();
  }, [fill]);

  return (
    <View style={GlobalStyle.stepProgress}>
      {Array.from({ length: ONBOARDING_STEP_COUNT }, (_, index) => {
        const number = index + 1;
        if (number > step) return <View key={number} style={GlobalStyle.stepProgressTrack} />;
        const current = number === step;
        return (
          <View key={number} style={GlobalStyle.stepProgressTrack}>
            <Animated.View
              style={[
                GlobalStyle.stepProgressFill,
                current && { transformOrigin: 'left', transform: [{ scaleX: fill }] },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

// Fælles ramme for et onboarding-trin: fremdrift, "Trin x af 6", titel, forklaring, indhold og
// knapper nederst. Titel og indhold glider ind forskudt. Valgfrie trin får "Spring over" (onSkip).
// nextDisabled spærrer "Næste", indtil de krævede oplysninger er udfyldt.
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
        <ScrollView
          contentContainerStyle={GlobalStyle.stepContent}
          keyboardShouldPersistTaps="handled"
        >
          {step != null && (
            <>
              <StepProgress step={step} />
              <Text style={GlobalStyle.stepCounter}>
                Trin {step} af {ONBOARDING_STEP_COUNT}
              </Text>
            </>
          )}
          <Reveal distance={18}>
            <Text style={GlobalStyle.title}>{title}</Text>
            {intro && <Text style={GlobalStyle.stepIntro}>{intro}</Text>}
          </Reveal>
          <Reveal index={2}>{children}</Reveal>
        </ScrollView>

        <View style={GlobalStyle.stepFooter}>
          {onSkip && <ButtonComponent title="Spring over" type="text" onPress={onSkip} />}
          <ButtonComponent
            title={nextLabel}
            type="primary"
            onPress={onNext}
            disabled={nextDisabled}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
