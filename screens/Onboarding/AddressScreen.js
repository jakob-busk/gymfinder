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
      intro="Så kan vi vise, hvor langt du har til centrene."
      onNext={() => navigation.navigate('Fødselsdato')}
      nextDisabled={user.location == null}
      nextDisabledReason="Vælg en adresse fra listen, eller brug din placering."
    >
      <RonnieHint pose="peger">
        Din adresse bruges kun til afstanden, ikke til andet.
      </RonnieHint>
      <AddressField address={user.address} location={user.location} onChange={handleAddress} />
    </OnboardingStep>
  );
}
