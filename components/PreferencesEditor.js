import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import { MACHINES } from '../data/const';
import { MAX_DISTANCE_OPTIONS } from '../data/userProfile';

// Præferencer, der kan slås til og fra. De er udgangspunktet for Filtre på Find.
const PREFERENCE_TOGGLES = [
  { key: 'sauna', label: 'Sauna' },
  { key: 'groupClasses', label: 'Holdtræning' },
  { key: 'open24h', label: 'Døgnåbent' },
  { key: 'multiCenterAccess', label: 'Adgang til flere centre' },
  { key: 'noBinding', label: 'Ingen binding' },
];

// Redigér Præferencer: maskiner, faciliteter, Abonnementstype, Binding og maks. afstand.
// onChange får hele det nye Præference-objekt.
export default function PreferencesEditor({ preferences, onChange }) {
  const update = (field, value) => onChange({ ...preferences, [field]: value });

  const toggleMachine = (machine) => {
    const machines = preferences.machines.includes(machine)
      ? preferences.machines.filter((entry) => entry !== machine)
      : [...preferences.machines, machine];
    update('machines', machines);
  };

  return (
    <View>
      <Text style={GlobalStyle.fieldLabel}>Maskiner</Text>
      <View style={GlobalStyle.sortRow}>
        {MACHINES.map((machine) => (
          <ButtonComponent
            key={machine}
            title={machine}
            type={preferences.machines.includes(machine) ? 'primary' : 'secondary'}
            onPress={() => toggleMachine(machine)}
          />
        ))}
      </View>

      <Text style={GlobalStyle.fieldLabel}>Krav</Text>
      <View style={GlobalStyle.sortRow}>
        {PREFERENCE_TOGGLES.map(({ key, label }) => (
          <ButtonComponent
            key={key}
            title={label}
            type={preferences[key] ? 'primary' : 'secondary'}
            onPress={() => update(key, !preferences[key])}
          />
        ))}
      </View>

      <Text style={GlobalStyle.fieldLabel}>Maks. afstand</Text>
      <View style={GlobalStyle.sortRow}>
        {MAX_DISTANCE_OPTIONS.map((km) => (
          <ButtonComponent
            key={km}
            title={`${km} km`}
            type={preferences.maxDistanceKm === km ? 'primary' : 'secondary'}
            onPress={() => update('maxDistanceKm', km)}
          />
        ))}
      </View>
    </View>
  );
}
