// Ansvarlig: Bastian
import { useContext, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import InfoButton from '../components/InfoButton';
import PriceAlertEditor from '../components/PriceAlertEditor';
import RonnieMascot from '../components/RonnieMascot';
import { formatKr } from '../data/centerDetail';
import { TRY_AGAIN_MESSAGE } from '../data/errors';
import { favoriteRows } from '../data/favorites';
import { changeCurrentMembershipThreshold, newCurrentMembershipAlert } from '../data/priceAlerts';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { registerForPush } from '../services/Notifications';

// Prisændringer under en krone vises ikke; de skyldes kun afrunding.
const MIN_VISIBLE_CHANGE = 1;

// Når push ikke kan bruges, gemmes Prisalarmen alligevel, og den tjekkes, når appen åbnes.
const NO_PUSH_MESSAGES = {
  denied:
    'Du har ikke givet GymFinder lov til at sende notifikationer, så du får besked, når du ' +
    'åbner appen. Slå notifikationer til under Indstillinger for at få besked med det samme.',
  unsupported:
    'Push-beskeder virker ikke i Expo Go på Android, så du får besked, når du åbner appen.',
  'no-account':
    'Push-beskeder kræver forbindelse til databasen, så du får besked, når du åbner appen.',
};

function PriceChange({ priceChange }) {
  if (priceChange == null || Math.abs(priceChange) < MIN_VISIBLE_CHANGE) return null;
  const amount = formatKr(Math.round(Math.abs(priceChange)));
  if (priceChange < 0) {
    return <Text style={GlobalStyle.priceDropText}>{amount}/md billigere end da du gemte den</Text>;
  }
  return <Text style={GlobalStyle.priceRiseText}>{amount}/md dyrere end da du gemte den</Text>;
}

// Favoritter og Prisalarmer: brugerens gemte Centre med den aktuelle laveste Ærlig årspris blandt
// de Tilbud, brugeren kan bruge dér (regnet med brugerens Rabatprofil, ligesom på Centerdetalje).
// Tryk på et Center åbner Centerdetalje, og en Favorit kan fjernes. Prisalarm kan slås til på
// hver Favorit og på Nuværende medlemskab med valgfri tærskel. Første gang en alarm slås til,
// spørges om lov til notifikationer, og push-tokenet gemmes på brugeren. Alt gemmes under
// brugerens uid i Firebase og huskes efter genstart.
export default function FavoritesScreen({ navigation }) {
  const { user, favorites, membershipAlert, authUser, account, accountsAvailable } =
    useContext(UserContext);
  const centerData = useCenterData();
  const loading = favorites.loading || centerData.loading || membershipAlert.loading;
  // Beskeden om, at push ikke kan bruges, vises kun én gang.
  const toldAboutPush = useRef(false);

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

  // Spørger om lov til notifikationer (kun første gang) og gemmer push-tokenet.
  const registerPush = async () => {
    try {
      const status = await registerForPush(authUser?.uid ?? null, { ask: true });
      const message = NO_PUSH_MESSAGES[status];
      if (message && !toldAboutPush.current) {
        toldAboutPush.current = true;
        Alert.alert('Prisalarmen er gemt', message);
      }
    } catch (error) {
      console.error('Gem push-token fejlede:', error);
    }
  };

  const handleFavoriteAlert = async (row, thresholdPerMonth) => {
    await favorites.setPriceAlert(row.centerId, { thresholdPerMonth }, row.honestYearlyPrice);
    await registerPush();
  };

  const handleMembershipAlert = async (thresholdPerMonth) => {
    const current = membershipAlert.currentMembershipAlert;
    await membershipAlert.saveAlert(
      current
        ? changeCurrentMembershipThreshold(current, thresholdPerMonth)
        : newCurrentMembershipAlert({ thresholdPerMonth }),
    );
    await registerPush();
  };

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
            console.error('Fjern Favorit fejlede:', error);
            Alert.alert('Kunne ikke fjerne Favorit', TRY_AGAIN_MESSAGE);
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
      {row.match && (
        <PriceAlertEditor
          priceAlert={row.favorite.priceAlert}
          onSave={(thresholdPerMonth) => handleFavoriteAlert(row, thresholdPerMonth)}
          onDisable={() => favorites.setPriceAlert(row.centerId, null)}
        />
      )}
    </View>
  );

  const renderMembership = () => {
    const membership = user.currentMembership;
    if (!membership) {
      return (
        <Text style={GlobalStyle.notStatedText}>
          Angiv dit nuværende medlemskab under Profil, så kan du få besked, når et Tilbud er
          billigere.
        </Text>
      );
    }
    const chainName = centerData.chains.find((chain) => chain.id === membership.chainId)?.name;
    return (
      <>
        <Text style={GlobalStyle.distanceText}>
          Du betaler {formatKr(membership.monthlyPrice)}/md{chainName ? ` hos ${chainName}` : ''}.
        </Text>
        <PriceAlertEditor
          kind="currentMembership"
          priceAlert={membershipAlert.currentMembershipAlert}
          onSave={handleMembershipAlert}
          onDisable={() => membershipAlert.saveAlert(null)}
        />
      </>
    );
  };

  const renderHeader = () => (
    <View>
      {(!account || account.isAnonymous) && (
        <Text style={GlobalStyle.noticeText}>
          {accountsAvailable
            ? 'Du bruger GymFinder anonymt, så dine Favoritter og Prisalarmer forsvinder, hvis ' +
              'du sletter appen. Gem din profil under Profil for at beholde dem.'
            : 'Dine Favoritter og Prisalarmer gemmes kun på denne telefon og forsvinder, hvis ' +
              'du sletter appen.'}
        </Text>
      )}
      <View style={GlobalStyle.card}>
        <Text style={GlobalStyle.cardTitle}>Nuværende medlemskab</Text>
        {renderMembership()}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={GlobalStyle.centeredContent}>
      <RonnieMascot size="small" />
      <Text style={GlobalStyle.emptyText}>
        Du har ingen Favoritter endnu. Tryk ♥ på et Center for at følge prisen.
      </Text>
    </View>
  );

  const renderContent = () => {
    if (loading) return <ActivityIndicator />;

    return (
      <FlatList
        data={rows}
        keyExtractor={(row) => row.centerId}
        renderItem={renderRow}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty()}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <SafeAreaView style={GlobalStyle.container} edges={['top']}>
      <Text style={GlobalStyle.title}>Favoritter</Text>
      {renderContent()}
    </SafeAreaView>
  );
}
