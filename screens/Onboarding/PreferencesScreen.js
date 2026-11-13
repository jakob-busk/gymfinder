// Ansvarlig: Jakob
import { useContext } from 'react';

import OnboardingStep from '../../components/OnboardingStep';
import PreferencesEditor from '../../components/PreferencesEditor';
import { UserContext } from '../../data/UserContext';
import { EMPTY_PREFERENCES } from '../../data/userProfile';

// Trin 5 (valgfrit): Præferencer. De bliver udgangspunktet for Filtrene på Find.
// "Spring over" vises kun, så længe intet er ændret fra standarden (ingen krav, standardafstand),
// og går bare videre (den nulstiller ikke noget).
export default function PreferencesScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);

  const setPreferences = (preferences) => {
    setUser((current) => ({ ...current, preferences }));
  };

  const goNext = () => navigation.navigate('Klar');
  const nothingChosen = Object.keys(EMPTY_PREFERENCES).every((key) =>
    key === 'machines'
      ? (user.preferences.machines ?? []).length === 0
      : user.preferences[key] === EMPTY_PREFERENCES[key],
  );

  return (
    <OnboardingStep
      step={5}
      title="Hvad er vigtigt for dig?"
      intro="Vælg det, du ikke kan undvære. Du kan altid ændre dine Filtre på Find."
      onNext={goNext}
      onSkip={nothingChosen ? goNext : undefined}
    >
      <PreferencesEditor preferences={user.preferences} onChange={setPreferences} />
    </OnboardingStep>
  );
}
