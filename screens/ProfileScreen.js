// Ansvarlig: Jakob
import { useContext } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import AddressField from '../components/AddressField';
import BirthDateField from '../components/BirthDateField';
import DiscountProfilePicker from '../components/DiscountProfilePicker';
import CurrentMembershipEditor from '../components/CurrentMembershipEditor';
import PreferencesEditor from '../components/PreferencesEditor';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';

// Profil: brugeren kan rette alt fra onboarding: adresse, fødselsdato, Rabatprofil,
// Nuværende medlemskab og Præferencer. Ændringer slår straks igennem i Matchning på Find og
// gemmes automatisk (Users/<uid>/profile i Firebase og lokalt). Om os nås herfra.
export default function ProfileScreen({ navigation }) {
  const { user, setUser, authUser } = useContext(UserContext);
  const { chains } = useCenterData();

  const updateField = (field, value) => {
    setUser((current) => ({ ...current, [field]: value }));
  };

  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['top']}>
      <ScrollView style={GlobalStyle.container} keyboardShouldPersistTaps="handled">
        <View style={GlobalStyle.titleRow}>
          <Text style={GlobalStyle.title}>Profil</Text>
          <ButtonComponent title="Om os" onPress={() => navigation.navigate('Om os')} />
        </View>

        <Text style={GlobalStyle.sectionLabel}>Adresse</Text>
        <AddressField
          address={user.address}
          location={user.location}
          onChange={({ address, location }) =>
            setUser((current) => ({ ...current, address, location }))
          }
        />

        <Text style={GlobalStyle.sectionLabel}>Fødselsdato</Text>
        <BirthDateField
          birthDate={user.birthDate}
          onChange={(birthDate) => updateField('birthDate', birthDate)}
        />

        <Text style={GlobalStyle.sectionLabel}>Rabatprofil</Text>
        <DiscountProfilePicker
          discountProfile={user.discountProfile}
          onChange={(discountProfile) => updateField('discountProfile', discountProfile)}
        />

        <Text style={GlobalStyle.sectionLabel}>Nuværende medlemskab</Text>
        <CurrentMembershipEditor
          currentMembership={user.currentMembership}
          chains={chains}
          onChange={(currentMembership) => updateField('currentMembership', currentMembership)}
        />

        <Text style={GlobalStyle.sectionLabel}>Præferencer</Text>
        <PreferencesEditor
          preferences={user.preferences}
          onChange={(preferences) => updateField('preferences', preferences)}
        />

        <Text style={GlobalStyle.sectionLabel}>Konto</Text>
        <Text style={GlobalStyle.stepIntro}>
          {authUser
            ? `Du bruger GymFinder anonymt (id ${authUser.uid.slice(0, 8)}…). Dine oplysninger ` +
              'er knyttet til denne telefon.'
            : 'Dine oplysninger gemmes kun på denne telefon.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
