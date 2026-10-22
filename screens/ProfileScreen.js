// Ansvarlig: Jakob
import { useContext } from 'react';
import { Alert, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import AccountForm from '../components/AccountForm';
import AddressField from '../components/AddressField';
import BirthDateField from '../components/BirthDateField';
import DiscountProfilePicker from '../components/DiscountProfilePicker';
import CurrentMembershipEditor from '../components/CurrentMembershipEditor';
import PreferencesEditor from '../components/PreferencesEditor';
import { UserContext } from '../data/UserContext';
import { accountErrorMessage } from '../data/account';
import { useCenterData } from '../services/CenterData';

// Profil: brugeren kan rette alt fra onboarding: adresse, fødselsdato, Rabatprofil,
// Nuværende medlemskab og Præferencer. Ændringer slår straks igennem i Matchning på Find og
// gemmes automatisk (Users/<uid>/profile i Firebase og lokalt). Om os nås herfra.
// Under Konto kan en anonym bruger gemme sin profil eller logge ind, og en bruger med konto kan
// logge ud.
export default function ProfileScreen({ navigation }) {
  const { user, setUser, account, accountsAvailable, createAccount, logOut } =
    useContext(UserContext);
  const { chains } = useCenterData();

  const updateField = (field, value) => {
    setUser((current) => ({ ...current, [field]: value }));
  };

  const handleCreateAccount = async (form) => {
    await createAccount(form);
    Alert.alert('Din profil er gemt', 'Du kan nu logge ind med din e-mail på en anden telefon.');
  };

  const handleLogOut = () => {
    Alert.alert(
      'Log ud?',
      'Dine oplysninger fjernes fra denne telefon, men ligger stadig på din konto. Du kan ' +
        'logge ind igen når som helst.',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Log ud',
          style: 'destructive',
          onPress: async () => {
            try {
              await logOut();
            } catch (error) {
              Alert.alert('Kunne ikke logge ud', accountErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  const renderAccount = () => {
    if (!accountsAvailable || !account) {
      return (
        <Text style={GlobalStyle.stepIntro}>Dine oplysninger gemmes kun på denne telefon.</Text>
      );
    }

    if (!account.isAnonymous) {
      const accountLabel = account.name ? `${account.name} (${account.email})` : account.email;
      return (
        <View style={GlobalStyle.accountBox}>
          <Text style={GlobalStyle.stepIntro}>
            Du er logget ind som {accountLabel}.
            Dine oplysninger, Favoritter og Prisalarmer følger din konto.
          </Text>
          <View style={GlobalStyle.accountActions}>
            <ButtonComponent title="Log ud" onPress={handleLogOut} />
          </View>
        </View>
      );
    }

    return (
      <View style={GlobalStyle.accountBox}>
        <Text style={GlobalStyle.stepIntro}>
          Du bruger GymFinder anonymt, så dine oplysninger er knyttet til denne telefon. Gem din
          profil, så følger alt med, også Favoritter og Prisalarmer, hvis du skifter telefon.
        </Text>
        <AccountForm mode="create" onSubmit={handleCreateAccount} />
        <View style={GlobalStyle.accountActions}>
          <ButtonComponent
            title="Jeg har allerede en konto"
            onPress={() => navigation.navigate('Log ind')}
          />
        </View>
      </View>
    );
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
        {renderAccount()}
      </ScrollView>
    </SafeAreaView>
  );
}
