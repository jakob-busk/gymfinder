// Ansvarlig: Jakob
import { useContext } from 'react';
import { Text } from 'react-native';

import GlobalStyle from '../../styles/GlobalStyle';
import OnboardingStep from '../../components/OnboardingStep';
import RonnieMascot from '../../components/RonnieMascot';
import { UserContext } from '../../data/UserContext';

// Trin 6: afslut som anonym. Profilen gemmes, og appen skifter til Find.
// Onboarding vises ikke igen på denne telefon.
export default function FinishScreen() {
  const { completeOnboarding } = useContext(UserContext);

  return (
    <OnboardingStep
      step={6}
      title="Så er du klar!"
      nextLabel="Fortsæt anonymt"
      onNext={completeOnboarding}
    >
      <RonnieMascot />
      <Text style={GlobalStyle.stepIntro}>
        Du fortsætter uden konto, så du behøver ikke give os din e-mail. Dine oplysninger er
        knyttet til denne telefon og forsvinder, hvis du sletter appen.
      </Text>
      <Text style={GlobalStyle.stepIntro}>
        Du kan rette alt under Profil, hvis dit liv ændrer sig.
      </Text>
    </OnboardingStep>
  );
}
