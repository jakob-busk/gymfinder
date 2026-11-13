// Ansvarlig: Christian
import { useContext, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import ChainCard from '../components/ChainCard';
import CenterMap from '../components/CenterMap';
import CenterPinInfo from '../components/CenterPinInfo';
import MapLegend from '../components/MapLegend';
import OfflineNotice from '../components/OfflineNotice';
import RonnieHint from '../components/RonnieHint';
import RonnieMascot from '../components/RonnieMascot';
import ScreenHeader from '../components/ScreenHeader';
import { matchCenters } from '../data/matchning';
import {
  discountProfileLine,
  filtersWithout,
  loosenFilterSuggestions,
  noRecommendationNotice,
  pinKind,
  sampleDataNotice,
} from '../data/findView';
import { activeFilterCount, activeFilterLabels } from '../data/filterSettings';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { useFilterSettings } from '../services/FilterSettings';

// Find: kort med brugerens placering og en pin pr. matchende Center, Filtre under kortet, og
// nedenunder en liste med ét kort pr. Kæde (Kædens bedste Center, med Kædens andre Centre til at
// folde ud). Kortet ligger øverst i listen, så det scroller væk, og listen får hele skærmen, når man
// scroller ned. Begge viser præcis resultatet fra Matchning i Matchnings rækkefølge, så Filtre (fra
// Filtre-skærmen, med Præferencerne som udgangspunkt, inkl. maks. afstand) slår ens igennem.
// Filtrene huskes efter genstart. Matchnings rækkefølge og Anbefalet bygger på Rangeringspris
// (Ærlig årspris + Afstandstillæg), som aldrig vises. Anbefalet er lavest Rangeringspris blandt
// sikre match; det er kort nr. 1 i listen og har den største pin. Hver Kædes bedste Center er
// fremhævet på kortet.
export default function FindScreen({ navigation }) {
  const { user } = useContext(UserContext);
  const [selectedId, setSelectedId] = useState(null);
  const centerData = useCenterData();
  const { filters, setFilters, ...filterSettings } = useFilterSettings(user.preferences);
  const loading = centerData.loading || filterSettings.loading;
  const filterCount = activeFilterCount(filters);
  const filterLabels = activeFilterLabels(filters);

  const { centers, chains, recommendedId } = matchCenters({
    centers: loading ? [] : centerData.centers,
    chains: centerData.chains,
    user,
    filters,
    location: user.location,
    today: new Date(),
  });
  // Forsvinder det valgte Center pga. nye Filtre, lukkes pin-boksen af sig selv.
  const selected = centers.find((match) => match.center.id === selectedId);

  // Intet sikkert match (og derfor intet Anbefalet): hvorfor, og en knap, der slår de Filtre fra,
  // som ingen Centre bekræfter.
  const noRecommendation = loading ? null : noRecommendationNotice(centers, recommendedId);
  const discountLine = discountProfileLine(user.discountProfile);

  const showDetails = (centerId) => navigation.navigate('CenterDetaljer', { centerId });
  // "Vælg rabat"/"Skift" ved Rabatprofilen åbner den samme redigering som under Profil. initial: false lægger
  // Profil-forsiden nedenunder, så tilbage-knappen virker, selv om Profil ikke er åbnet endnu.
  const editDiscountProfile = () =>
    navigation.navigate('Profil', {
      screen: 'Redigér profil',
      params: { section: 'discountProfile' },
      initial: false,
    });
  const filterLabel = filterCount > 0 ? `Filtre (${filterCount})` : 'Filtre';
  // Mens der hentes, står der ikke "0 Centre", men at Centrene er på vej.
  const legendText = loading
    ? 'Henter centre …'
    : `${centers.length} ${centers.length === 1 ? 'center' : 'centre'}` +
      (filters.maxDistanceKm != null ? ` inden for ${filters.maxDistanceKm} km` : '');

  // Mens Centrene hentes, eller når ingen matcher: Ronnie i stedet for listen.
  const renderStatus = () => {
    if (loading) {
      return (
        <View style={GlobalStyle.paragraph}>
          <RonnieHint pose="sveder/løfter">Ronnie finder centre tæt på dig …</RonnieHint>
          <ActivityIndicator />
        </View>
      );
    }

    if (centers.length === 0) {
      const suggestions = loosenFilterSuggestions(filters, {
        hasLocation: Boolean(user.location),
      });
      return (
        <View style={GlobalStyle.emptyState}>
          <RonnieMascot size="small" pose="trækker på skuldrene" />
          <Text style={GlobalStyle.centeredText}>
            Ronnie kunne ikke finde nogen centre, der passer til dine filtre. Prøv at løsne dem:
          </Text>
          {suggestions.map((suggestion) => (
            <Text key={suggestion} style={GlobalStyle.suggestionText}>
              • {suggestion}
            </Text>
          ))}
          <View style={GlobalStyle.paragraph}>
            <ButtonComponent
              title="Ret filtre"
              type="primary"
              onPress={() => navigation.navigate('Filtre')}
            />
          </View>
        </View>
      );
    }
    return null;
  };

  // Eksempeldata: hvorfor, og "Prøv igen", hvis databasen ikke kunne læses.
  const notice = centerData.source === 'sample' && !centerData.loading && (
    <View style={GlobalStyle.sampleNotice}>
      <Text style={GlobalStyle.noticeText}>
        {sampleDataNotice({
          configured: centerData.configured,
          failed: Boolean(centerData.error),
        })}
      </Text>
      {centerData.configured && (
        <ButtonComponent title="Prøv igen" type="ghost" size="small" onPress={centerData.retry} />
      )}
    </View>
  );

  // Rabatprofil, kort, forklaring og Filtre øverst i listen.
  const listHeader = (
    <>
      {notice}
      {/* Hvilken Rabatprofil priserne er regnet med, så man kan se det uden at åbne Profil. */}
      <View style={GlobalStyle.discountLine}>
        <Text style={[GlobalStyle.mutedText, GlobalStyle.shrinkText]}>
          {discountLine.text} ·
        </Text>
        <ButtonComponent
          title={discountLine.action}
          type="text"
          size="small"
          onPress={editDiscountProfile}
        />
      </View>
      <View style={GlobalStyle.mapBox}>
        <CenterMap
          userLocation={user.location}
          matches={centers}
          chains={chains}
          recommendedId={recommendedId}
          onSelect={setSelectedId}
        />
        {selected && (
          <CenterPinInfo
            match={selected}
            isRecommended={selected.center.id === recommendedId}
            isChainBest={pinKind(selected.center.id, { chains, recommendedId }) === 'chainBest'}
            onShowDetails={() => showDetails(selected.center.id)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </View>
      <MapLegend text={legendText} />

      {/* Filtre i en række under kortet. */}
      <View style={GlobalStyle.toolbar}>
        <ButtonComponent
          title={filterLabel}
          type="ghost"
          icon="options-outline"
          onPress={() => navigation.navigate('Filtre')}
        />
      </View>
      {/* De aktive Filtre som små piller, så man kan se, hvad listen er filtreret på. Kun
          visning; et tryk åbner Filtre. */}
      {filterLabels.length > 0 && (
        <Pressable
          style={GlobalStyle.filterPills}
          onPress={() => navigation.navigate('Filtre')}
          accessibilityRole="button"
          accessibilityLabel={`Aktive filtre: ${filterLabels.join(', ')}. Åbner filtre.`}
        >
          {filterLabels.map((label) => (
            <View key={label} style={GlobalStyle.filterPill}>
              <Text style={GlobalStyle.filterPillText}>{label}</Text>
            </View>
          ))}
        </Pressable>
      )}
      {noRecommendation && (
        <View style={GlobalStyle.sampleNotice}>
          <Text style={GlobalStyle.noticeText}>{noRecommendation.text}</Text>
          <ButtonComponent
            title={noRecommendation.action}
            type="ghost"
            size="small"
            onPress={() => setFilters(filtersWithout(filters, noRecommendation.keys))}
          />
        </View>
      )}
    </>
  );

  // Uden forbindelse: besked og "Prøv igen" i stedet for kort og liste.
  if (centerData.offline) {
    return (
      <SafeAreaView style={GlobalStyle.container} edges={['top']}>
        <ScreenHeader logo />
        <OfflineNotice onRetry={centerData.retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={GlobalStyle.container} edges={['top']}>
      <ScreenHeader logo />
      <FlatList
        data={chains}
        keyExtractor={(chainMatch) => chainMatch.best.center.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderStatus()}
        contentContainerStyle={GlobalStyle.scrollEnd}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ChainCard
            chainMatch={item}
            filters={filters}
            index={index}
            isRecommended={item.best.center.id === recommendedId}
            onShowDetails={showDetails}
          />
        )}
      />
    </SafeAreaView>
  );
}
