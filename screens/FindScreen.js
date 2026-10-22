// Ansvarlig: Christian
import { useContext, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import CenterCard from '../components/CenterCard';
import CenterMap from '../components/CenterMap';
import CenterPinInfo from '../components/CenterPinInfo';
import RonnieMascot from '../components/RonnieMascot';
import { SORT_OPTIONS, matchCenters } from '../data/matchning';
import { loosenFilterSuggestions } from '../data/findView';
import { activeFilterCount } from '../data/filterSettings';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { useFilterSettings } from '../services/FilterSettings';

// Find: kort med brugerens placering og en pin pr. Center, og en liste over de samme Centre
// nedenunder. Begge viser præcis resultatet fra Matchning, så Filtre (fra Filtre-skærmen, med
// Præferencerne som udgangspunkt, inkl. maks. afstand) og sortering slår ens igennem. Filtre og
// sortering huskes efter genstart. Anbefalet er lavest Ærlig årspris blandt sikre match og
// fremhæves både på kortet og i listen.
export default function FindScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const [selectedId, setSelectedId] = useState(null);
  const centerData = useCenterData();
  const { filters, sortBy, setSortBy, ...filterSettings } = useFilterSettings(
    user.preferences,
  );
  const loading = centerData.loading || filterSettings.loading;
  const filterCount = activeFilterCount(filters);

  const { centers, recommendedId } = matchCenters({
    centers: loading ? [] : centerData.centers,
    chains: centerData.chains,
    user,
    filters,
    sortBy,
    location: user.location,
    today: new Date(),
  });
  // Forsvinder det valgte Center pga. nye Filtre, lukkes pin-boksen af sig selv.
  const selected = centers.find((match) => match.center.id === selectedId);

  const showDetails = (centerId) => navigation.navigate('CenterDetaljer', { centerId });

  const renderList = () => {
    if (loading) return <ActivityIndicator />;

    if (centers.length === 0) {
      const suggestions = loosenFilterSuggestions(filters, {
        hasLocation: Boolean(user.location),
      });
      return (
        <ScrollView contentContainerStyle={GlobalStyle.emptyState}>
          <RonnieMascot size="small" />
          <Text style={GlobalStyle.centeredText}>
            Ronnie kunne ikke finde nogen Centre, der matcher dine Filtre. Prøv at løsne dem:
          </Text>
          {suggestions.map((suggestion) => (
            <Text key={suggestion} style={GlobalStyle.suggestionText}>
              • {suggestion}
            </Text>
          ))}
          <View style={GlobalStyle.paragraph}>
            <ButtonComponent
              title="Ret Filtre"
              type="primary"
              onPress={() => navigation.navigate('Filtre')}
            />
          </View>
        </ScrollView>
      );
    }

    return (
      <FlatList
        data={centers}
        keyExtractor={(match) => match.center.id}
        renderItem={({ item }) => (
          <CenterCard
            match={item}
            isRecommended={item.center.id === recommendedId}
            onShowDetails={() => showDetails(item.center.id)}
          />
        )}
      />
    );
  };

  return (
    <SafeAreaView style={GlobalStyle.container} edges={['top']}>
      <View style={GlobalStyle.titleRow}>
        <Text style={GlobalStyle.title}>Find</Text>
        <ButtonComponent
          title={filterCount > 0 ? `Filtre (${filterCount})` : 'Filtre'}
          onPress={() => navigation.navigate('Filtre')}
        />
      </View>

      {centerData.source === 'sample' && !centerData.loading && (
        <Text style={GlobalStyle.noticeText}>Viser eksempeldata. Priserne er ikke opdaterede.</Text>
      )}

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

      <View style={GlobalStyle.mapBox}>
        <CenterMap
          userLocation={user.location}
          matches={centers}
          recommendedId={recommendedId}
          onSelect={setSelectedId}
        />
        {selected && (
          <CenterPinInfo
            match={selected}
            isRecommended={selected.center.id === recommendedId}
            onShowDetails={() => showDetails(selected.center.id)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </View>
      <Text style={GlobalStyle.mapLegend}>
        {centers.length} {centers.length === 1 ? 'Center' : 'Centre'}
        {filters.maxDistanceKm != null ? ` inden for ${filters.maxDistanceKm} km` : ''}
        {user.address ? ` fra ${user.address}` : ''} · Blå = dig · Orange = Anbefalet
      </Text>

      {renderList()}
    </SafeAreaView>
  );
}
