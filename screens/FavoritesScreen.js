// Ansvarlig: Bastian
import { useContext } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import InfoButton from '../components/InfoButton';
import RonnieMascot from '../components/RonnieMascot';
import { formatKr } from '../data/centerDetail';
import { favoriteRows } from '../data/favorites';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';

// Prisændringer under en krone vises ikke; de skyldes kun afrunding.
const MIN_VISIBLE_CHANGE = 1;

function PriceChange({ priceChange }) {
  if (priceChange == null || Math.abs(priceChange) < MIN_VISIBLE_CHANGE) return null;
  const amount = formatKr(Math.round(Math.abs(priceChange)));
  if (priceChange < 0) {
    return <Text style={GlobalStyle.priceDropText}>{amount}/md billigere end da du gemte den</Text>;
  }
  return <Text style={GlobalStyle.priceRiseText}>{amount}/md dyrere end da du gemte den</Text>;
}

// Favoritter: brugerens gemte Centre med den aktuelle laveste Ærlig årspris blandt de Tilbud,
// brugeren kan bruge dér (regnet med brugerens Rabatprofil, ligesom på Centerdetalje). Tryk på
// et Center åbner Centerdetalje, og en Favorit kan fjernes. Favoritterne gemmes under brugerens
// uid i Firebase og huskes efter genstart.
export default function FavoritesScreen({ navigation }) {
  const { user, favorites } = useContext(UserContext);
  const centerData = useCenterData();
  const loading = favorites.loading || centerData.loading;

  const rows = loading
    ? []
    : favoriteRows({
        favorites: favorites.favorites,
        centers: centerData.centers,
        chains: centerData.chains,
        user,
        today: new Date(),
      });

  const showDetails = (centerId) => navigation.navigate('CenterDetaljer', { centerId });

  const handleRemove = (row) => {
    const name = row.center?.name ?? 'Centret';
    Alert.alert('Fjern Favorit?', `${name} fjernes fra dine Favoritter.`, [
      { text: 'Annuller', style: 'cancel' },
      {
        text: 'Fjern',
        style: 'destructive',
        onPress: async () => {
          try {
            await favorites.removeFavorite(row.centerId);
          } catch (error) {
            Alert.alert('Kunne ikke fjerne Favorit', error.message);
          }
        },
      },
    ]);
  };

  const renderRow = ({ item: row }) => (
    <View style={GlobalStyle.card}>
      <View style={GlobalStyle.favoriteRow}>
        <Pressable
          style={GlobalStyle.favoriteInfo}
          disabled={!row.match}
          onPress={() => showDetails(row.centerId)}
          accessibilityRole="button"
        >
          <Text style={GlobalStyle.cardTitle}>{row.center?.name ?? 'Ukendt Center'}</Text>
          {row.chain && <Text style={GlobalStyle.distanceText}>{row.chain.name}</Text>}
          {row.match ? (
            <>
              <View style={GlobalStyle.inlineRow}>
                <Text style={GlobalStyle.priceText}>
                  {formatKr(Math.round(row.honestYearlyPrice))}/md (ærlig årspris)
                </Text>
                <InfoButton term="honestYearlyPrice" />
              </View>
              <PriceChange priceChange={row.priceChange} />
              <Text style={GlobalStyle.link}>Se mere →</Text>
            </>
          ) : (
            <Text style={GlobalStyle.notStatedText}>
              {row.center
                ? 'Centret har ingen Tilbud lige nu.'
                : 'Centret findes ikke længere i GymFinder.'}
            </Text>
          )}
        </Pressable>
        <ButtonComponent title="Fjern" onPress={() => handleRemove(row)} />
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) return <ActivityIndicator />;

    if (rows.length === 0) {
      return (
        <View style={GlobalStyle.centeredContent}>
          <RonnieMascot size="small" />
          <Text style={GlobalStyle.emptyText}>
            Du har ingen Favoritter endnu. Tryk ♥ på et Center for at følge prisen.
          </Text>
        </View>
      );
    }

    return <FlatList data={rows} keyExtractor={(row) => row.centerId} renderItem={renderRow} />;
  };

  return (
    <SafeAreaView style={GlobalStyle.container} edges={['top']}>
      <Text style={GlobalStyle.title}>Favoritter</Text>
      {renderContent()}
    </SafeAreaView>
  );
}
