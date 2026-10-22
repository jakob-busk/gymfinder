// Ansvarlig: Jakob
import { useContext } from 'react';

import OnboardingStep from '../../components/OnboardingStep';
import CurrentMembershipEditor from '../../components/CurrentMembershipEditor';
import { UserContext } from '../../data/UserContext';
import { useCenterData } from '../../services/CenterData';

// Trin 4 (valgfrit): Nuværende medlemskab. Med en månedspris kan vi vise, hvad du kan spare.
// "Spring over" betyder "Ingen".
export default function CurrentMembershipScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);
  const { chains } = useCenterData();

  const setCurrentMembership = (currentMembership) => {
    setUser((current) => ({ ...current, currentMembership }));
  };

  const handleSkip = () => {
    setCurrentMembership(null);
    navigation.navigate('Præferencer');
  };

  return (
    <OnboardingStep
      step={4}
      title="Er du medlem et sted i dag?"
      intro="Skriv hvad du betaler om måneden, så viser vi, hvor meget du kan spare ved at skifte."
      onNext={() => navigation.navigate('Præferencer')}
      onSkip={handleSkip}
    >
      <CurrentMembershipEditor
        currentMembership={user.currentMembership}
        chains={chains}
        onChange={setCurrentMembership}
      />
    </OnboardingStep>
  );
}
