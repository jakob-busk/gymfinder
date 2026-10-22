// Ansvarlig: Jakob
import { useContext } from 'react';

import OnboardingStep from '../../components/OnboardingStep';
import AddressField from '../../components/AddressField';
import { UserContext } from '../../data/UserContext';

// Trin 1 (krævet): adresse eller "Brug min placering". Distance til Centrene regnes herfra.
export default function AddressScreen({ navigation }) {
  const { user, setUser } = useContext(UserContext);

  const handleAddress = ({ address, location }) => {
    setUser((current) => ({ ...current, address, location }));
  };

  return (
    <OnboardingStep
      step={1}
      title="Hvor bor du?"
      intro="Vi bruger din adresse til at vise afstanden til Centrene. Du kan også bruge din placering."
      onNext={() => navigation.navigate('Fødselsdato')}
      nextDisabled={user.location == null}
    >
      <AddressField address={user.address} location={user.location} onChange={handleAddress} />
    </OnboardingStep>
  );
}
