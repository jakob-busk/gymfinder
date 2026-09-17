import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import GymCard from '../components/GymCard';
import { GYMS, SORT_OPTIONS } from '../data/const';
import { getVisibleGyms } from '../data/gymLogic';

export default function DashboardScreen({ user }) {
  const [sortBy, setSortBy] = useState('Pris');

  const { visibleGyms, recommendedId } = getVisibleGyms(GYMS, user.preferences, sortBy);

  return (
    <View style={GlobalStyle.container}>
      <Text style={GlobalStyle.title}>Dashboard</Text>
      <Text style={GlobalStyle.sectionLabel}>Anbefalede fitness centre</Text>

      <View style={GlobalStyle.infoBox}>
        <Text style={GlobalStyle.infoTitle}>Dine oplysninger (overview hentet fra profil)</Text>
        <Text>Adresse: {user.address}</Text>
        <Text>Studerende: {user.isStudent ? 'JA' : 'NEJ'}</Text>
      </View>

      <Text style={GlobalStyle.sectionLabel}>Sorter efter</Text>
      <View style={GlobalStyle.sortRow}>
        {SORT_OPTIONS.map((option) => (
          <ButtonComponent
            key={option}
            title={option}
            type={sortBy === option ? 'primary' : 'secondary'}
            onPress={() => setSortBy(option)}
          />
        ))}
      </View>

      {visibleGyms.length === 0 ? (
        <Text style={GlobalStyle.emptyText}>
          Ingen centre matcher alle dine præferencer lige nu. Prøv at justere dine præferencer på Profil-siden.
        </Text>
      ) : (
        <FlatList
          data={visibleGyms}
          keyExtractor={(gym) => gym.id}
          renderItem={({ item }) => <GymCard gym={item} isRecommended={item.id === recommendedId} />}
        />
      )}
    </View>
  );
}
