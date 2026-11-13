// Ansvarlig: Jakob
import { useContext, useState } from 'react';

import OnboardingStep from '../../components/OnboardingStep';
import CurrentMembershipEditor from '../../components/CurrentMembershipEditor';
import { UserContext } from '../../data/UserContext';
import { useCenterData } from '../../services/CenterData';

// Trin 4 (valgfrit): Nuværende medlemskab. Med en månedspris kan vi vise, hvad du kan spare.
// "Spring over" vises kun, så længe der ikke er gemt et medlemskab, og går bare videre (den
// nulstiller ikke noget).
export default function CurrentMembershipScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);
  const { chains } = useCenterData();
  // false, når "Jeg er medlem et sted" er valgt uden en gyldig månedspris. Så spærres Næste.
  const [complete, setComplete] = useState(true);

  const setCurrentMembership = (currentMembership) => {
    setUser((current) => ({ ...current, currentMembership }));
  };

  const goNext = () => navigation.navigate('Præferencer');
  const nothingChosen = user.currentMembership == null;

  return (
    <OnboardingStep
      step={4}
      title="Er du medlem et sted i dag?"
      intro="Skriv hvad du betaler om måneden, så viser vi, hvor meget du kan spare ved at skifte."
      onNext={goNext}
      nextDisabled={!complete}
      nextDisabledReason="Skriv din månedspris, eller vælg Ingen."
      onSkip={nothingChosen ? goNext : undefined}
    >
      <CurrentMembershipEditor
        currentMembership={user.currentMembership}
        chains={chains}
        onChange={setCurrentMembership}
        onCompleteChange={setComplete}
      />
    </OnboardingStep>
  );
}
