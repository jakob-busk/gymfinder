// Ansvarlig: Christian
import { useContext, useEffect, useRef, useState } from 'react';
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

// Filtre til Find (sorteringen vælges kun på Find, så den står ét sted): sauna, holdtræning, døgnåbent, Landsdækkende
// (Abonnementstype), ingen Binding, maskiner og maks. afstand. Udgangspunktet er brugerens
// Præferencer. Ændringer gemmes med det samme og huskes efter genstart; Nulstil går tilbage
// til Præferencerne. Find læser de samme gemte Filtre, så kort og liste følger med.
// Knappen nederst viser, hvor mange Centre Filtrene giver, før man går tilbage til Find.
// Nulstil kan fortrydes i UNDO_MS: "Filtre nulstillet · Fortryd" står over knapperne.
const UNDO_MS = 5000;

export default function FiltersScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const centerData = useCenterData();
  const { filters, sortBy, isCustom, loading, setFilters, reset, restore } = useFilterSettings(
    user.preferences,
  );
  // Det, der var gemt før Nulstil, mens Fortryd vises; null, når der intet er at fortryde.
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const handleReset = () => {
    const previous = reset();
    clearTimeout(undoTimer.current);
    setUndo({ previous });
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const handleUndo = () => {
    clearTimeout(undoTimer.current);
    if (undo) restore(undo.previous);
    setUndo(null);
  };

  // Retter brugeren Filtrene igen, er der ikke længere noget at fortryde.
  const handleFilters = (next) => {
    if (undo) {
      clearTimeout(undoTimer.current);
      setUndo(null);
    }
    setFilters(next);
  };

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
        <PreferencesEditor preferences={filters} onChange={handleFilters} />

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

      {undo && (
        <View style={GlobalStyle.undoBar} accessibilityLiveRegion="polite">
          <Text style={GlobalStyle.undoText}>Filtre nulstillet</Text>
          <ButtonComponent title="Fortryd" type="text" onPress={handleUndo} />
        </View>
      )}
      <View style={GlobalStyle.stickyFooter}>
        <ButtonComponent title="Nulstil" type="text" onPress={handleReset} disabled={!isCustom} />
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
