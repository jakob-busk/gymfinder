import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import Chip from './Chip';
import SegmentedControl from './SegmentedControl';
import ToggleRow from './ToggleRow';
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

const DISTANCE_OPTIONS = MAX_DISTANCE_OPTIONS.map((km) => ({ value: km, label: `${km} km` }));

// Redigér Præferencer: maks. afstand, krav (kontakter) og maskiner (mærker).
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
      <Text style={GlobalStyle.groupTitle}>Maks. afstand</Text>
      <SegmentedControl
        options={DISTANCE_OPTIONS}
        value={preferences.maxDistanceKm}
        onChange={(km) => update('maxDistanceKm', km)}
      />

      <Text style={GlobalStyle.groupTitle}>Krav</Text>
      <View style={GlobalStyle.group}>
        {PREFERENCE_TOGGLES.map(({ key, label }, index) => (
          <View key={key}>
            {index > 0 && <View style={GlobalStyle.groupDivider} />}
            <ToggleRow
              label={label}
              value={Boolean(preferences[key])}
              onChange={(value) => update(key, value)}
            />
          </View>
        ))}
      </View>

      <Text style={GlobalStyle.groupTitle}>Maskiner</Text>
      <View style={GlobalStyle.chipRow}>
        {MACHINES.map((machine) => (
          <Chip
            key={machine}
            label={machine}
            selected={preferences.machines.includes(machine)}
            onPress={() => toggleMachine(machine)}
          />
        ))}
      </View>
    </View>
  );
}
