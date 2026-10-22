// Ansvarlig: Christian
import { useContext } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import InfoButton from '../components/InfoButton';
import PreferencesEditor from '../components/PreferencesEditor';
import SortPicker from '../components/SortPicker';
import { matchCenters } from '../data/matchning';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { useFilterSettings } from '../services/FilterSettings';

// Filtre og sortering til Find: sauna, holdtræning, døgnåbent, adgang til flere centre
// (Abonnementstype), ingen Binding, maskiner og maks. afstand. Udgangspunktet er brugerens
// Præferencer. Ændringer gemmes med det samme og huskes efter genstart; Nulstil går tilbage
// til Præferencerne. Find læser de samme gemte Filtre, så kort og liste følger med.
// Knappen nederst viser, hvor mange Centre Filtrene giver, før man går tilbage til Find.
export default function FiltersScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const centerData = useCenterData();
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

  const count = centerData.loading
    ? null
    : matchCenters({
        centers: centerData.centers,
        chains: centerData.chains,
        user,
        filters,
        sortBy,
        location: user.location,
        today: new Date(),
      }).centers.length;
  const showLabel =
    count == null ? 'Vis resultater' : `Vis ${count} ${count === 1 ? 'Center' : 'Centre'}`;

  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={[GlobalStyle.stepContent, GlobalStyle.filtersContent]}>
        <Text style={GlobalStyle.groupTitle}>Sortér efter</Text>
        <SortPicker sortBy={sortBy} onChange={setSortBy} full />

        <PreferencesEditor preferences={filters} onChange={setFilters} />

        <Text style={GlobalStyle.mutedText}>
          {isCustom
            ? 'Du har rettet Filtrene. Nulstil for at bruge dine Præferencer fra Profil igen.'
            : 'Udgangspunktet er dine Præferencer fra Profil.'}
        </Text>
        <View style={[GlobalStyle.inlineRow, GlobalStyle.paragraph]}>
          <Text style={[GlobalStyle.mutedText, GlobalStyle.shrinkText]}>
            Centre, der med sikkerhed ikke opfylder dine Filtre, skjules. Er det ukendt, vises de
            med "Ikke oplyst". Maks. afstand gælder altid.
          </Text>
          <InfoButton term="notStated" />
        </View>
      </ScrollView>

      <View style={GlobalStyle.stickyFooter}>
        <ButtonComponent title="Nulstil" type="text" onPress={reset} disabled={!isCustom} />
        <View style={GlobalStyle.fill}>
          <ButtonComponent
            title={showLabel}
            type="primary"
            full
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
