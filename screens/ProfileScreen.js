import { View, Text, TextInput, ScrollView } from 'react-native';
import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import { MACHINES, SUBSCRIPTION_TYPES } from '../data/const';

export default function ProfileScreen({ user, setUser }) { // Profil siden. Brugeren kan ændre sine personlige oplysninger og præferencer. Ændringerne gemmes i state i App.js.
  function updateField(field, value) {
    setUser((current) => ({ ...current, [field]: value }));
  }

  function updatePreference(field, value) { // Opdaterer brugerens præferencer i state. Bruger spread operatoren for at bevare de eksisterende præferencer og kun ændre den specifikke præference, der er blevet opdateret.
    setUser((current) => ({ ...current, preferences: { ...current.preferences, [field]: value } }));
  }

  function toggleMachine(machine) { // slår en maskine til eller fra i brugerens præferencer. Hvis maskinen allerede er valgt, fjernes den fra listen. Hvis den ikke er valgt, tilføjes den til listen.
    const current = user.preferences.machines;
    const next = current.includes(machine)
      ? current.filter((item) => item !== machine)
      : [...current, machine];
    updatePreference('machines', next);
  }

  return ( // Render funktionen returnerer en ScrollView, der indeholder alle profiloplysningerne og præferencerne. Brugeren kan ændre sine oplysninger og præferencer, og ændringerne gemmes i state i App.js.
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
