// Ansvarlig: Christian
import { useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import CenterTitle from '../components/CenterTitle';
import FavoriteButton from '../components/FavoriteButton';
import InfoButton from '../components/InfoButton';
import OfferReceipt from '../components/OfferReceipt';
import Reveal from '../components/Reveal';
import { facilityRows, formatKr, matchCenter, turns30Notice } from '../data/centerDetail';
import { centerQuestion } from '../data/ronnie';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { openSignupPage } from '../services/Signup';

// Centerdetalje: Kæde, adresse og Distance, og Centrets Tilbud som faner. Det valgte Tilbud vises
// som en kvittering for brugerens første år, der ender i Ærlig årspris (se OfferReceipt).
// Priserne kommer fra Matchning, så de er de samme som på Find. Fra start er det billigste Tilbud
// for brugeren valgt. "Tilmeld dig ..." åbner tilmeldingen til det valgte Tilbud. Viser også
// 30-års-advarsel, Spar mere-forslag, faciliteter og "Spørg Ronnie om dette center".
// ♥ i titelrækken gør Centret til Favorit. Kvitteringen toner ind på ny, når et andet Tilbud
// vælges, så skiftet kan ses.
export default function CenterDetailScreen({ navigation, route }) {
  const centerId = route?.params?.centerId;
  const { user } = useContext(UserContext);
  const { centers, chains, loading } = useCenterData();
  const [selectedOfferId, setSelectedOfferId] = useState(null);
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

  const selected = offers.find((priced) => priced.offer.id === selectedOfferId) ?? bestOffer;
  const distance = match.distanceKm != null ? `${match.distanceKm.toFixed(1)} km fra dig` : null;

  // Åbner Spørg Ronnie med et færdigt spørgsmål om Centret. askedAt gør, at spørgsmålet også
  // sættes ind, hvis man spørger om samme Center igen.
  const handleAskRonnie = () => {
    navigation.navigate('Faner', {
      screen: 'Spørg Ronnie',
      params: { question: centerQuestion(center.name), centerId: center.id, askedAt: Date.now() },
    });
  };

  // 30-års-advarsel og Spar mere-forslag. Ronnie er aldrig med her.
  const notices = (
    <>
      {ageNotice && (
        <View style={GlobalStyle.warningBox}>
          <View style={GlobalStyle.warningHeader}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.text} />
            <Text style={GlobalStyle.warningTitle}>Prisen stiger, når du fylder 30</Text>
          </View>
          <Text style={GlobalStyle.bodyText}>
            Du fylder 30 i {ageNotice.birthdayMonth}. Fra måned {ageNotice.fromPeriod} stiger prisen
            på {ageNotice.offerName} fra {formatKr(ageNotice.priceBefore)} til{' '}
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
          <Text style={GlobalStyle.bodyText}>
            Bliv {suggestion.label} for {suggestion.membershipPricePerYear} kr/år og spar{' '}
            {formatKr(Math.round(suggestion.savingPerYear))}/år her (
            {offerNames[suggestion.offerId]} til{' '}
            {formatKr(Math.round(suggestion.honestYearlyPrice))}/md).
          </Text>
        </View>
      ))}
    </>
  );

  return (
    <ScrollView style={GlobalStyle.screen} contentContainerStyle={GlobalStyle.stepContent}>
      <View style={GlobalStyle.titleRow}>
        <View style={GlobalStyle.fill}>
          <CenterTitle chain={chain} name={center.name} size="screen" />
        </View>
        <FavoriteButton center={center} chain={chain} />
      </View>
      {/* Kædens logo står i titlen, så her står kun adresse og afstand. */}
      <Text style={GlobalStyle.detailHeroMeta}>
        {[center.address, distance].filter(Boolean).join(' · ')}
      </Text>

      {offers.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={GlobalStyle.offerTabs}
        >
          {offers.map((priced) => {
            const active = priced === selected;
            return (
              <Pressable
                key={priced.offer.id}
                style={[GlobalStyle.offerTab, active && GlobalStyle.offerTabActive]}
                onPress={() => setSelectedOfferId(priced.offer.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[GlobalStyle.offerTabText, active && GlobalStyle.offerTabTextActive]}>
                  {priced.offer.name}
                </Text>
                <Text
                  style={[GlobalStyle.offerTabPrice, active && GlobalStyle.offerTabPriceActive]}
                >
                  {Math.round(priced.honestYearlyPrice)} kr/md
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Reveal key={selected.offer.id} distance={16}>
        <OfferReceipt
          pricedOffer={selected}
          chain={chain}
          user={user}
          isCheapest={selected === bestOffer && offers.length > 1}
        />
      </Reveal>

      {match.savingPerMonth > 0 && selected === bestOffer && (
        <Text style={[GlobalStyle.savingText, GlobalStyle.paragraph]}>
          Du sparer {formatKr(Math.round(match.savingPerMonth))}/md i forhold til dit nuværende
          medlemskab.
        </Text>
      )}

      <View style={[GlobalStyle.choiceList, GlobalStyle.paragraph]}>
        <ButtonComponent
          title={`Tilmeld dig ${selected.offer.name}`}
          type="primary"
          icon="open-outline"
          full
          onPress={() => openSignupPage(center, chain, selected)}
        />
        <Text style={[GlobalStyle.mapLegend, GlobalStyle.centeredText]}>
          Åbner {selected.offer.name} på {chain?.name ?? 'kædens'} egen side.
        </Text>
        <ButtonComponent
          title="Spørg Ronnie om dette center"
          type="text"
          ronnie
          onPress={handleAskRonnie}
        />
      </View>

      {notices}

      <View style={GlobalStyle.inlineRow}>
        <Text style={GlobalStyle.sectionLabel}>Faciliteter</Text>
        {facilities.some((row) => row.value === 'Ikke oplyst') && <InfoButton term="notStated" />}
      </View>
      <View style={GlobalStyle.facilityGrid}>
        {facilities.map((row, index) => (
          <Reveal key={row.key} index={index} distance={12} style={GlobalStyle.facilityCell}>
            <Text style={GlobalStyle.mapLegend}>{row.label}</Text>
            <Text style={GlobalStyle.feeValue}>{row.value}</Text>
          </Reveal>
        ))}
      </View>
    </ScrollView>
  );
}
