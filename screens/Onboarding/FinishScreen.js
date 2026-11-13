// Ansvarlig: Jakob
import { useContext, useState } from 'react';
import { Alert, Text } from 'react-native';

import GlobalStyle from '../../styles/GlobalStyle';
import AccountForm from '../../components/AccountForm';
import OnboardingStep from '../../components/OnboardingStep';
import RonnieMascot from '../../components/RonnieMascot';
import { confirmAction } from '../../components/confirm';
import { UserContext } from '../../data/UserContext';
import { accountErrorMessage } from '../../data/account';

// Trin 6: "Opret konto" med navn, e-mail og adgangskode, eller "Fortsæt anonymt".
// Med konto linkes den anonyme bruger, så alt, der er udfyldt, følger med til kontoen.
// Profilen gemmes, og appen skifter til Find. Onboarding vises ikke igen på denne telefon.
// "Fortsæt anonymt" er en tekstknap; "Opret konto" bliver primærknap, så snart formularen er
// udfyldt. Trykker brugeren "Fortsæt anonymt" med en udfyldt formular, spørges der først.
export default function FinishScreen() {
  const { completeOnboarding, createAccount, accountsAvailable } = useContext(UserContext);
  const [formFilled, setFormFilled] = useState(false);

  // Fejler oprettelsen, viser AccountForm fejlen under felterne. Er kontoen oprettet, men kunne
  // profilen ikke gemmes i databasen (fx regler, der afviser), ligger den stadig på telefonen,
  // og brugeren får at vide hvorfor.
  const handleCreateAccount = async (form) => {
    const account = await createAccount(form);
    const saveError = await completeOnboarding(account?.uid);
    if (saveError) {
      Alert.alert(
        'Kontoen er oprettet, men profilen er kun gemt på telefonen',
        accountErrorMessage(saveError),
      );
    }
  };

  const handleContinueAnonymously = async () => {
    if (accountsAvailable && formFilled) {
      const confirmed = await confirmAction({
        title: 'Fortsæt uden konto?',
        message:
          'Du er i gang med at oprette en konto. Fortsætter du anonymt, bliver den ikke ' +
          'oprettet, og det, du har skrevet, gemmes ikke.',
        confirmText: 'Fortsæt anonymt',
        cancelText: 'Tilbage til kontoen',
      });
      if (!confirmed) return;
    }
    completeOnboarding();
  };

  return (
    <OnboardingStep
      step={6}
      title="Så er du klar!"
      nextLabel="Fortsæt anonymt"
      nextType={accountsAvailable ? 'text' : 'primary'}
      onNext={handleContinueAnonymously}
    >
      <RonnieMascot pose="jubler" />
      {accountsAvailable && (
        <>
          <Text style={GlobalStyle.stepIntro}>
            Opret en konto, så følger dine oplysninger, Favoritter og Prisalarmer med, hvis du
            skifter telefon.
          </Text>
          <AccountForm
            mode="create"
            submitLabel="Opret konto"
            submitType={formFilled ? 'primary' : 'secondary'}
            onSubmit={handleCreateAccount}
            onFilledChange={setFormFilled}
          />
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
