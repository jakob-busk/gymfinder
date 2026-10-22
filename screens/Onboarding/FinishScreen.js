// Ansvarlig: Jakob
import { useContext } from 'react';
import { Text } from 'react-native';

import GlobalStyle from '../../styles/GlobalStyle';
import AccountForm from '../../components/AccountForm';
import OnboardingStep from '../../components/OnboardingStep';
import RonnieMascot from '../../components/RonnieMascot';
import { UserContext } from '../../data/UserContext';

// Trin 6: "Gem din profil" med navn, e-mail og adgangskode, eller "Fortsæt anonymt".
// Med konto linkes den anonyme bruger, så alt, der er udfyldt, følger med til kontoen.
// Profilen gemmes, og appen skifter til Find. Onboarding vises ikke igen på denne telefon.
export default function FinishScreen() {
  const { completeOnboarding, createAccount, accountsAvailable } = useContext(UserContext);

  const handleCreateAccount = async (form) => {
    await createAccount(form);
    await completeOnboarding();
  };

  return (
    <OnboardingStep
      step={6}
      title="Så er du klar!"
      nextLabel="Fortsæt anonymt"
      onNext={completeOnboarding}
    >
      <RonnieMascot size="small" />
      {accountsAvailable && (
        <>
          <Text style={GlobalStyle.stepIntro}>
            Gem din profil, så følger dine oplysninger, Favoritter og Prisalarmer med, hvis du
            skifter telefon.
          </Text>
          <AccountForm mode="create" onSubmit={handleCreateAccount} />
        </>
      )}
      <Text style={GlobalStyle.stepIntro}>
        Fortsætter du anonymt, behøver du ikke give os din e-mail. Dine oplysninger er knyttet til
        denne telefon og forsvinder, hvis du sletter appen. Du kan altid gemme din profil senere
        under Profil.
      </Text>
    </OnboardingStep>
  );
}
