// Ansvarlig: Jakob
import { useContext } from 'react';
import { Text, View } from 'react-native';

import GlobalStyle from '../../styles/GlobalStyle';
import ButtonComponent from '../../components/ButtonComponent';
import OnboardingStep from '../../components/OnboardingStep';
import RonnieMascot from '../../components/RonnieMascot';
import { UserContext } from '../../data/UserContext';

// Velkomst: Ronnie fortæller kort, hvad GymFinder kan, før brugeren giver oplysninger.
// Har brugeren allerede en konto (fx på en ny telefon), kan onboarding springes over med Log ind.
export default function WelcomeScreen({ navigation }) {
  const { accountsAvailable } = useContext(UserContext);

  return (
    <OnboardingStep
      title="Hej, jeg er Ronnie!"
      nextLabel="Kom i gang"
      onNext={() => navigation.navigate('Adresse')}
    >
      <RonnieMascot />
      <Text style={GlobalStyle.stepIntro}>
        Jeg hjælper dig med at finde det Center, der reelt er billigst for netop dig. Jeg regner
        oprettelsesgebyr, admingebyr, kampagner og dine Rabatter med og viser det hele som én Ærlig
        årspris.
      </Text>
      <Text style={GlobalStyle.stepIntro}>
        Først skal jeg vide, hvor du bor, og hvornår du er født. Resten kan du springe over og
        tilføje senere under Profil.
      </Text>
      {accountsAvailable && (
        <View style={GlobalStyle.accountActions}>
          <ButtonComponent
            title="Jeg har allerede en konto"
            onPress={() => navigation.navigate('Log ind')}
          />
        </View>
      )}
    </OnboardingStep>
  );
}
