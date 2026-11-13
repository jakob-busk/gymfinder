// Ansvarlig: Christian
import { useContext } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import InfoButton from '../components/InfoButton';
import PreferencesEditor from '../components/PreferencesEditor';
import { matchCenters } from '../data/matchning';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { useFilterSettings } from '../services/FilterSettings';

// Filtre til Find: sauna, holdtræning, døgnåbent, Landsdækkende
// (Abonnementstype), ingen Binding, maskiner og maks. afstand. Brugerens Præferencer er valgt
// på forhånd. Ændringer gemmes med det samme og huskes efter genstart; Nulstil går tilbage
// til Præferencerne. Find læser de samme gemte Filtre, så kort og liste følger med.
// Knappen nederst viser, hvor mange Centre Filtrene giver, før man går tilbage til Find.
export default function FiltersScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const centerData = useCenterData();
  const { filters, isCustom, loading, setFilters, reset } = useFilterSettings(
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
        location: user.location,
        today: new Date(),
      }).centers.length;
  const showLabel =
    count == null ? 'Vis resultater' : `Vis ${count} ${count === 1 ? 'center' : 'centre'}`;

  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={[GlobalStyle.stepContent, GlobalStyle.filtersContent]}>
        <PreferencesEditor preferences={filters} onChange={setFilters} />

        <Text style={GlobalStyle.mutedText}>
          {isCustom
            ? 'Du har rettet filtrene. Nulstil for at bruge dine ønsker fra Profil igen.'
            : 'Dine faste ønsker fra Profil er valgt på forhånd.'}
        </Text>
        <View style={[GlobalStyle.inlineRow, GlobalStyle.paragraph]}>
          <Text style={[GlobalStyle.mutedText, GlobalStyle.shrinkText]}>
            Vi skjuler centre, der ikke har det, du har valgt. Ved vi det ikke, står der "ikke
            oplyst". Maks. afstand gælder altid.
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
