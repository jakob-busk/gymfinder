// Ansvarlig: Jakob
import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import CenterCard from '../components/CenterCard';
import { CENTERS, CHAINS } from '../data/const';
import { DISCOUNT_GROUPS, SORT_OPTIONS, matchCenters } from '../data/matchning';

// Dashboard: viser Centre for brugeren via Matchning. Brugerens Præferencer bruges som Filtre,
// og Anbefalet er altid lavest Ærlig årspris blandt sikre match, uanset sortering.
export default function DashboardScreen({ user }) {
  const [sortBy, setSortBy] = useState('honestYearlyPrice');

  const { centers, recommendedId } = matchCenters({
    centers: CENTERS,
    chains: CHAINS,
    user,
    filters: user.preferences,
    sortBy,
    location: user.location,
    today: new Date(),
  });
  const discountLabels = user.discountProfile.map((group) => DISCOUNT_GROUPS[group].label);

  return (
    <View style={GlobalStyle.container}>
      <Text style={GlobalStyle.title}>Dashboard</Text>

      <View style={GlobalStyle.infoBox}>
        <Text style={GlobalStyle.infoTitle}>Dine oplysninger</Text>
        <Text>Adresse: {user.address}</Text>
        <Text>Rabatprofil: {discountLabels.length > 0 ? discountLabels.join(', ') : 'Ingen'}</Text>
      </View>

      <Text style={GlobalStyle.sectionLabel}>Sorter efter</Text>
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

      {centers.length === 0 ? (
        <Text style={GlobalStyle.emptyText}>
          Ingen Centre matcher dine Filtre lige nu. Prøv at løsne dem på Profil-siden.
        </Text>
      ) : (
        <FlatList
          data={centers}
          keyExtractor={(match) => match.center.id}
          renderItem={({ item }) => (
            <CenterCard match={item} isRecommended={item.center.id === recommendedId} />
          )}
        />
      )}
    </View>
  );
}
