// Ansvarlig: Jakob
import { useContext } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import InfoButton from '../components/InfoButton';
import { MACHINES } from '../data/const';
import { DISCOUNT_GROUPS } from '../data/matchning';
import { UserContext } from '../data/UserContext';

// Præferencer, der kan slås til og fra. De bruges som Filtre på Find.
const PREFERENCE_TOGGLES = [
  { key: 'sauna', label: 'Sauna' },
  { key: 'groupClasses', label: 'Holdtræning' },
  { key: 'open24h', label: 'Døgnåbent' },
  { key: 'multiCenterAccess', label: 'Adgang til flere centre' },
  { key: 'noBinding', label: 'Ingen binding' },
];

// Profil siden. Brugeren kan ændre sine oplysninger, Rabatprofil og Præferencer.
// Ændringerne gemmes i state i App.js (UserContext). Om os nås herfra.
export default function ProfileScreen({ navigation }) {
  const { user, setUser, authUser } = useContext(UserContext);

  const updateField = (field, value) => {
    setUser((current) => ({ ...current, [field]: value }));
  };

  // Spread bevarer de øvrige Præferencer og ændrer kun den ene.
  const updatePreference = (field, value) => {
    setUser((current) => ({ ...current, preferences: { ...current.preferences, [field]: value } }));
  };

  const toggleInList = (list, item) =>
    list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

  const toggleDiscountGroup = (group) => {
    updateField('discountProfile', toggleInList(user.discountProfile, group));
  };

  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['top']}>
      <ScrollView style={GlobalStyle.container}>
        <View style={GlobalStyle.titleRow}>
          <Text style={GlobalStyle.title}>Profil</Text>
          <ButtonComponent title="Om os" onPress={() => navigation.navigate('Om os')} />
        </View>

        <Text style={GlobalStyle.sectionLabel}>Personoplysninger</Text>
        <Text>Navn</Text>
        <TextInput
          style={GlobalStyle.input}
          value={user.name}
          onChangeText={(text) => updateField('name', text)}
        />
        <Text>Adresse</Text>
        <TextInput
          style={GlobalStyle.input}
          value={user.address}
          onChangeText={(text) => updateField('address', text)}
        />
        <Text>Fødselsdato (ÅÅÅÅ-MM-DD)</Text>
        <TextInput
          style={GlobalStyle.input}
          value={user.birthDate}
          onChangeText={(text) => updateField('birthDate', text)}
        />

        <Text style={GlobalStyle.sectionLabel}>Kontooplysninger</Text>
        <Text>Brugernavn: {user.username}</Text>
        <Text>Email: {user.email}</Text>
        <Text>Adgangskode: ********</Text>
        <Text>
          Login: {authUser ? `Anonym bruger (id ${authUser.uid.slice(0, 8)}…)` : 'Ikke forbundet'}
        </Text>

        <Text style={GlobalStyle.sectionLabel}>Rabatprofil</Text>
        <View style={GlobalStyle.sortRow}>
          {Object.entries(DISCOUNT_GROUPS).map(([group, info]) => (
            <View key={group} style={GlobalStyle.inlineRow}>
              <ButtonComponent
                title={info.label}
                type={user.discountProfile.includes(group) ? 'primary' : 'secondary'}
                onPress={() => toggleDiscountGroup(group)}
              />
              {group === 'partner' && <InfoButton term="trainWithPartner" />}
            </View>
          ))}
        </View>

        <Text style={GlobalStyle.sectionLabel}>Præferencer</Text>
        <Text>Maskiner</Text>
        <View style={GlobalStyle.sortRow}>
          {MACHINES.map((machine) => (
            <ButtonComponent
              key={machine}
              title={machine}
              type={user.preferences.machines.includes(machine) ? 'primary' : 'secondary'}
              onPress={() =>
                updatePreference('machines', toggleInList(user.preferences.machines, machine))
              }
            />
          ))}
        </View>

        <Text>Krav</Text>
        <View style={GlobalStyle.sortRow}>
          {PREFERENCE_TOGGLES.map(({ key, label }) => (
            <ButtonComponent
              key={key}
              title={label}
              type={user.preferences[key] ? 'primary' : 'secondary'}
              onPress={() => updatePreference(key, !user.preferences[key])}
            />
          ))}
        </View>

        <Text>Maks. afstand</Text>
        <View style={GlobalStyle.sortRow}>
          {[5, 15, 50].map((km) => (
            <ButtonComponent
              key={km}
              title={`${km} km`}
              type={user.preferences.maxDistanceKm === km ? 'primary' : 'secondary'}
              onPress={() => updatePreference('maxDistanceKm', km)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
