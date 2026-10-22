// Ansvarlig: Jakob
import { useContext } from 'react';

import OnboardingStep from '../../components/OnboardingStep';
import PreferencesEditor from '../../components/PreferencesEditor';
import { UserContext } from '../../data/UserContext';
import { EMPTY_PREFERENCES } from '../../data/userProfile';

// Trin 5 (valgfrit): Præferencer. De bliver udgangspunktet for Filtrene på Find.
// "Spring over" betyder ingen krav, kun standardafstanden.
export default function PreferencesScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);

  const setPreferences = (preferences) => {
    setUser((current) => ({ ...current, preferences }));
  };

  const handleSkip = () => {
    setPreferences(EMPTY_PREFERENCES);
    navigation.navigate('Klar');
  };

  return (
    <OnboardingStep
      step={5}
      title="Hvad er vigtigt for dig?"
      intro="Vælg det, du ikke kan undvære. Du kan altid ændre dine Filtre på Find."
      onNext={() => navigation.navigate('Klar')}
      onSkip={handleSkip}
    >
      <PreferencesEditor preferences={user.preferences} onChange={setPreferences} />
    </OnboardingStep>
  );
}
