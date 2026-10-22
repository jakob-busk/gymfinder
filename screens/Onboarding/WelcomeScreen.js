// Ansvarlig: Jakob
import { Text } from 'react-native';

import GlobalStyle from '../../styles/GlobalStyle';
import OnboardingStep from '../../components/OnboardingStep';
import RonnieMascot from '../../components/RonnieMascot';

// Velkomst: Ronnie fortæller kort, hvad GymFinder kan, før brugeren giver oplysninger.
export default function WelcomeScreen({ navigation }) {
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
    </OnboardingStep>
  );
}
