import { View, Text, TextInput, ScrollView } from 'react-native';
import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import { MACHINES, SUBSCRIPTION_TYPES } from '../data/const';

export default function ProfileScreen({ user, setUser }) {
  function updateField(field, value) {
    setUser((current) => ({ ...current, [field]: value }));
  }

  function updatePreference(field, value) {
    setUser((current) => ({ ...current, preferences: { ...current.preferences, [field]: value } }));
  }

  function toggleMachine(machine) {
    const current = user.preferences.machines;
    const next = current.includes(machine)
      ? current.filter((item) => item !== machine)
      : [...current, machine];
    updatePreference('machines', next);
  }

  return (
    <ScrollView style={GlobalStyle.container}>
      <Text style={GlobalStyle.title}>Profil</Text>

      <Text style={GlobalStyle.sectionLabel}>Personoplysninger</Text>
      <Text>Navn</Text>
      <TextInput style={GlobalStyle.input} value={user.name} onChangeText={(text) => updateField('name', text)} />
      <Text>Adresse</Text>
      <TextInput
        style={GlobalStyle.input}
        value={user.address}
        onChangeText={(text) => updateField('address', text)}
      />
      <Text>Studerende: {user.isStudent ? 'JA' : 'NEJ'}</Text>

      <Text style={GlobalStyle.sectionLabel}>Kontooplysninger</Text>
      <Text>Brugernavn: {user.username}</Text>
      <Text>Email: {user.email}</Text>
      <Text>Adgangskode: ********</Text>

      <Text style={GlobalStyle.sectionLabel}>Præferencer</Text>
      <Text>Maskiner</Text>
      <View style={GlobalStyle.sortRow}>
        {MACHINES.map((machine) => (
          <ButtonComponent
            key={machine}
            title={machine}
            type={user.preferences.machines.includes(machine) ? 'primary' : 'secondary'}
            onPress={() => toggleMachine(machine)}
          />
        ))}
      </View>

      <Text>Sauna</Text>
      <View style={GlobalStyle.sortRow}>
        <ButtonComponent
          title="Ja"
          type={user.preferences.sauna === true ? 'primary' : 'secondary'}
          onPress={() => updatePreference('sauna', true)}
        />
        <ButtonComponent
          title="Nej"
          type={user.preferences.sauna === false ? 'primary' : 'secondary'}
          onPress={() => updatePreference('sauna', false)}
        />
        <ButtonComponent
          title="Ingen præference"
          type={user.preferences.sauna === null ? 'primary' : 'secondary'}
          onPress={() => updatePreference('sauna', null)}
        />
      </View>

      <Text>Abonnementstype</Text>
      <View style={GlobalStyle.sortRow}>
        {SUBSCRIPTION_TYPES.map((type) => (
          <ButtonComponent
            key={type}
            title={type}
            type={user.preferences.subscriptionType === type ? 'primary' : 'secondary'}
            onPress={() => updatePreference('subscriptionType', type)}
          />
        ))}
      </View>
    </ScrollView>
  );
}
