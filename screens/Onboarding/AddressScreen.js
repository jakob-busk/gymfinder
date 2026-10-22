// Ansvarlig: Jakob
import { useContext } from 'react';

import OnboardingStep from '../../components/OnboardingStep';
import AddressField from '../../components/AddressField';
import RonnieHint from '../../components/RonnieHint';
import { UserContext } from '../../data/UserContext';

// Trin 1 (krævet): adresse eller "Brug min placering". Distance til Centrene regnes herfra.
export default function AddressScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);

  // null betyder, at brugeren har rettet teksten uden at vælge en ny adresse. Så nulstilles
  // adressen, og "Næste" spærres, indtil en adresse er valgt igen.
  const handleAddress = (place) => {
    setUser((current) => ({
      ...current,
      address: place?.address ?? '',
      location: place?.location ?? null,
    }));
  };

  return (
    <OnboardingStep
      step={1}
      title="Hvor bor du?"
      intro="Vi bruger din adresse til at vise afstanden til Centrene. Du kan også bruge din placering."
      onNext={() => navigation.navigate('Fødselsdato')}
      nextDisabled={user.location == null}
    >
      <RonnieHint pose="peger">
        Jeg bruger kun din adresse til at regne afstanden til Centrene ud.
      </RonnieHint>
      <AddressField address={user.address} location={user.location} onChange={handleAddress} />
    </OnboardingStep>
  );
}
