// Ansvarlig: Jakob
import { useContext } from 'react';

import OnboardingStep from '../../components/OnboardingStep';
import DiscountProfilePicker from '../../components/DiscountProfilePicker';
import RonnieHint from '../../components/RonnieHint';
import { UserContext } from '../../data/UserContext';

// Trin 3 (valgfrit): Rabatprofil. Rabatterne for de valgte Rabatgrupper regnes med i
// Ærlig årspris. "Spring over" betyder ingen Rabatgrupper.
export default function DiscountProfileScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);

  const setDiscountProfile = (discountProfile) => {
    setUser((current) => ({ ...current, discountProfile }));
  };

  const handleSkip = () => {
    setDiscountProfile([]);
    navigation.navigate('Medlemskab');
  };

  return (
    <OnboardingStep
      step={3}
      title="Har du ret til en Rabat?"
      intro="Vælg dem, der passer på dig. Så regner vi automatisk de Rabatter med, du har ret til."
      onNext={() => navigation.navigate('Medlemskab')}
      onSkip={handleSkip}
    >
      <RonnieHint pose="tænker">
        Studerende, senior eller vil du træne med en makker? Så kan du ofte spare flere hundrede
        kroner om året.
      </RonnieHint>
      <DiscountProfilePicker discountProfile={user.discountProfile} onChange={setDiscountProfile} />
    </OnboardingStep>
  );
}
