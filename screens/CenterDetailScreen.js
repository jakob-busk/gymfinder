// Ansvarlig: Christian
import { useContext, useMemo } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import FavoriteButton from '../components/FavoriteButton';
import InfoButton from '../components/InfoButton';
import OfferPriceCard from '../components/OfferPriceCard';
import { facilityRows, formatKr, matchCenter, turns30Notice } from '../data/centerDetail';
import { centerQuestion } from '../data/ronnie';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { openSignupPage } from '../services/Signup';

// Centerdetalje: adresse, Distance, faciliteter og Kæde, og alle Centrets Tilbud med brugerens
// Ærlig årspris, Kvartalspris og prisudregning måned for måned. Priserne kommer fra Matchning,
// så de er de samme som på Find. Viser også 30-års-advarsel, Spar mere-forslag, Makkerpris og
// "Gå til tilmelding" og "Spørg Ronnie om dette center". ♥ i titelrækken gør Centret til Favorit.
export default function CenterDetailScreen({ navigation, route }) {
  const centerId = route?.params?.centerId;
  const { user } = useContext(UserContext);
  const { centers, chains, loading } = useCenterData();
  const center = centers.find((entry) => entry.id === centerId);

  const match = useMemo(
    () => matchCenter({ center, chains, user, today: new Date() }),
    [center, chains, user],
  );

  if (loading) {
    return (
      <View style={GlobalStyle.loadingScreen}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={GlobalStyle.container}>
        <Text style={GlobalStyle.emptyText}>
          {center ? 'Centret har ingen Tilbud lige nu.' : 'Centret blev ikke fundet.'}
        </Text>
      </View>
    );
  }

  const { chain, offers, bestOffer } = match;
  const facilities = facilityRows(center);
  const ageNotice =
    turns30Notice(user.birthDate, bestOffer) ??
    offers.map((priced) => turns30Notice(user.birthDate, priced)).find(Boolean);
  const offerNames = Object.fromEntries(
    offers.map((priced) => [priced.offer.id, priced.offer.name]),
  );

  const handleSignup = async () => {
    try {
      await openSignupPage(center, chain);
    } catch (error) {
      Alert.alert('Kunne ikke åbne tilmeldingen', error.message);
    }
  };

  // Åbner Spørg Ronnie med et færdigt spørgsmål om Centret. askedAt gør, at spørgsmålet også
  // sættes ind, hvis man spørger om samme Center igen.
  const handleAskRonnie = () => {
    navigation.navigate('Faner', {
      screen: 'Spørg Ronnie',
      params: { question: centerQuestion(center.name), centerId: center.id, askedAt: Date.now() },
    });
  };

  return (
    <ScrollView style={GlobalStyle.screen} contentContainerStyle={GlobalStyle.stepContent}>
      <View style={GlobalStyle.titleRow}>
        <Text style={[GlobalStyle.title, GlobalStyle.shrinkText]}>{center.name}</Text>
        <FavoriteButton center={center} chain={chain} />
      </View>
      <Text style={GlobalStyle.cardTitle}>{chain?.name}</Text>
      <Text style={GlobalStyle.distanceText}>
        {center.address}
        {match.distanceKm != null ? ` · ${match.distanceKm.toFixed(1)} km fra dig` : ''}
      </Text>

      <View style={GlobalStyle.infoBox}>
        <Text style={GlobalStyle.infoTitle}>Billigst for dig: {bestOffer.yearlyOption.label}</Text>
        <Text>
          {bestOffer.offer.name} til {formatKr(Math.round(bestOffer.honestYearlyPrice))}/md i
          ærlig årspris.
        </Text>
        {match.savingPerMonth != null && match.savingPerMonth > 0 && (
          <Text style={GlobalStyle.savingText}>
            Du sparer {formatKr(Math.round(match.savingPerMonth))}/md i forhold til dit nuværende
            medlemskab.
          </Text>
        )}
      </View>

      {ageNotice && (
        <View style={GlobalStyle.warningBox}>
          <Text style={GlobalStyle.warningTitle}>Prisen stiger, når du fylder 30</Text>
          <Text>
            Du fylder 30 i {ageNotice.birthdayMonth}. Fra måned {ageNotice.fromPeriod} stiger
            prisen på {ageNotice.offerName} fra {formatKr(ageNotice.priceBefore)} til{' '}
            {formatKr(ageNotice.priceAfter)}/md. Det er regnet med i din ærlige årspris.
          </Text>
        </View>
      )}

      {match.savingSuggestions.map((suggestion) => (
        <View key={suggestion.discountGroup} style={GlobalStyle.infoBox}>
          <View style={GlobalStyle.inlineRow}>
            <Text style={GlobalStyle.infoTitle}>Spar mere</Text>
            <InfoButton term="savingSuggestion" />
          </View>
          <Text>
            Bliv {suggestion.label} for {suggestion.membershipPricePerYear} kr/år og spar{' '}
            {formatKr(Math.round(suggestion.savingPerYear))}/år her (
            {offerNames[suggestion.offerId]} til{' '}
            {formatKr(Math.round(suggestion.honestYearlyPrice))}/md).
          </Text>
        </View>
      ))}

      <View style={GlobalStyle.inlineRow}>
        <Text style={GlobalStyle.sectionLabel}>Faciliteter</Text>
        {facilities.some((row) => row.value === 'Ikke oplyst') && <InfoButton term="notStated" />}
      </View>
      {facilities.map((row) => (
        <View key={row.key} style={GlobalStyle.feeRow}>
          <Text style={GlobalStyle.feeLabel}>{row.label}</Text>
          <Text style={GlobalStyle.feeValue}>{row.value}</Text>
        </View>
      ))}

      <Text style={GlobalStyle.sectionLabel}>
        {offers.length === 1 ? 'Tilbud i Centret' : `${offers.length} Tilbud i Centret`}
      </Text>
      {offers.map((priced) => (
        <OfferPriceCard
          key={priced.offer.id}
          pricedOffer={priced}
          user={user}
          isCheapest={priced === bestOffer}
        />
      ))}

      <ButtonComponent title="Gå til tilmelding" type="primary" onPress={handleSignup} />
      <Text style={[GlobalStyle.mapLegend, GlobalStyle.paragraph]}>
        Du tilmelder dig på {chain?.name ?? 'kædens'} egen side.
      </Text>
      <ButtonComponent title="Spørg Ronnie om dette center" onPress={handleAskRonnie} />
    </ScrollView>
  );
}
