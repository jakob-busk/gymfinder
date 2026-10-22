// Ansvarlig: Jakob
import { useContext } from 'react';

import OnboardingStep from '../../components/OnboardingStep';
import BirthDateField from '../../components/BirthDateField';
import { UserContext } from '../../data/UserContext';

// Trin 2 (krævet): fødselsdato. Den afgør Aldersgruppen (under 30 eller 30+) og dermed prisen.
export default function BirthDateScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);

  // null betyder, at datoen er rettet til noget ugyldigt. Så spærres "Næste" igen.
  const handleBirthDate = (birthDate) => {
    setUser((current) => ({ ...current, birthDate }));
  };

  return (
    <OnboardingStep
      step={2}
      title="Hvornår er du født?"
      intro="Nogle Kæder har forskellig pris for under 30 og 30+. Fylder du 30 inden for et år, regner vi den højere pris med fra den måned."
      onNext={() => navigation.navigate('Rabatprofil')}
      nextDisabled={!user.birthDate}
    >
      <BirthDateField birthDate={user.birthDate} onChange={handleBirthDate} />
    </OnboardingStep>
  );
}
