// Ansvarlig: Christian
import { useContext } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import InfoButton from '../components/InfoButton';
import PreferencesEditor from '../components/PreferencesEditor';
import { SORT_OPTIONS } from '../data/matchning';
import { UserContext } from '../data/UserContext';
import { useFilterSettings } from '../services/FilterSettings';

// Filtre og sortering til Find: sauna, holdtræning, døgnåbent, adgang til flere centre
// (Abonnementstype), ingen Binding, maskiner og maks. afstand. Udgangspunktet er brugerens
// Præferencer. Ændringer gemmes med det samme og huskes efter genstart; Nulstil går tilbage
// til Præferencerne. Find læser de samme gemte Filtre, så kort og liste følger med.
export default function FiltersScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const { filters, sortBy, isCustom, loading, setFilters, setSortBy, reset } = useFilterSettings(
    user.preferences,
  );

  if (loading) {
    return (
      <View style={GlobalStyle.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={GlobalStyle.container} contentContainerStyle={GlobalStyle.filtersContent}>
      <Text style={GlobalStyle.sectionLabel}>Sortér efter</Text>
      <View style={GlobalStyle.sortRow}>
        {SORT_OPTIONS.map((option) => (
          <ButtonComponent
            key={option.id}
            title={option.label}
            type={sortBy === option.id ? 'primary' : 'secondary'}
            onPress={() => setSortBy(option.id)}
          />
        ))}
      </View>

      <Text style={GlobalStyle.sectionLabel}>Filtre</Text>
      <Text style={GlobalStyle.noticeText}>
        {isCustom
          ? 'Du har rettet Filtrene. Nulstil for at bruge dine Præferencer igen.'
          : 'Udgangspunktet er dine Præferencer fra Profil.'}
      </Text>
      <PreferencesEditor preferences={filters} onChange={setFilters} />

      <View style={GlobalStyle.infoBox}>
        <View style={GlobalStyle.inlineRow}>
          <Text style={GlobalStyle.infoTitle}>Ikke oplyst</Text>
          <InfoButton term="notStated" />
        </View>
        <Text>
          Centre, der med sikkerhed ikke opfylder dine Filtre, skjules. Er det ukendt, vises
          Centret med mærket "Ikke oplyst". Maks. afstand gælder altid.
        </Text>
      </View>

      <View style={GlobalStyle.sortRow}>
        <ButtonComponent title="Vis resultater" type="primary" onPress={() => navigation.goBack()} />
        <ButtonComponent title="Nulstil" onPress={reset} />
      </View>
    </ScrollView>
  );
}
