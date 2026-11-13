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
import OfflineNotice from '../components/OfflineNotice';
import Reveal from '../components/Reveal';
import {
  facilityRows,
  formatDistance,
  formatKr,
  formatNumber,
  formatPrice,
  matchCenter,
  offerBasisText,
  turns30Notice,
} from '../data/centerDetail';
import { centerQuestion } from '../data/ronnie';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { openSignupPage } from '../services/Signup';

// Centerdetalje: titel (Kæde og navn), adresse og Distance, og Centrets Tilbud som faner. Øverst
// står prisen for det valgte Tilbud (Ærlig årspris og de første 3 mdr.), så 30-års-advarsel og
// Spar mere-forslag, og derefter "Tilmeld dig ...", der åbner tilmeldingen til det valgte Tilbud.
// Udregningen bag prisen (kvitteringen, se OfferReceipt) er foldet sammen under "Se udregningen".
// Priserne kommer fra Matchning, så de er de samme som på Find. Fra start er det billigste Tilbud
// for brugeren valgt. ♥ i titelrækken gør Centret til Favorit. Viser også faciliteter og "Spørg
// Ronnie om dette Center". Prisen toner ind på ny, når et andet Tilbud vælges, så skiftet kan ses.
export default function CenterDetailScreen({ navigation, route }) {
  const centerId = route?.params?.centerId;
  const { user } = useContext(UserContext);
  const { centers, chains, loading, offline, retry } = useCenterData();
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const center = centers.find((entry) => entry.id === centerId);

  const match = useMemo(
    () => matchCenter({ center, chains, user, today: new Date() }),
    [center, chains, user],
  );

  if (offline) {
    return (
      <View style={GlobalStyle.container}>
        <OfflineNotice onRetry={retry} />
      </View>
    );
  }

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
        <View style={GlobalStyle.emptyState}>
          <ButtonComponent
            title="Tilbage til Find"
            type="secondary"
            icon="arrow-back"
            onPress={() => navigation.navigate('Faner', { screen: 'Find' })}
          />
        </View>
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
  const distance = match.distanceKm != null ? `${formatDistance(match.distanceKm)} fra dig` : null;

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
            {formatPrice(ageNotice.priceAfter)}. Det er regnet med i din ærlige årspris.
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
            Bliv {suggestion.label} for {formatPrice(suggestion.membershipPricePerYear, 'år')} og
            spar {formatPrice(Math.round(suggestion.savingPerYear), 'år')} her (
            {offerNames[suggestion.offerId]} til{' '}
            {formatPrice(Math.round(suggestion.honestYearlyPrice))}).
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
                  {formatPrice(Math.round(priced.honestYearlyPrice))}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Prisen for det valgte Tilbud øverst, så den og Tilmeld ses med det samme. */}
      <Reveal key={selected.offer.id} distance={12}>
        <View style={GlobalStyle.detailPrice}>
          <View style={GlobalStyle.cardPriceRow}>
            <Text style={GlobalStyle.cardPrice}>
              {formatNumber(Math.round(selected.honestYearlyPrice))}
            </Text>
            <View style={GlobalStyle.cardPriceUnitBox}>
              <Text style={GlobalStyle.cardPriceUnit}>kr.</Text>
              <View style={GlobalStyle.inlineRow}>
                <Text style={GlobalStyle.cardPriceCaption}>ærlig årspris · gns. pr. md.</Text>
                <InfoButton term="honestYearlyPrice" />
              </View>
            </View>
          </View>
          <Text style={GlobalStyle.mutedText}>{offerBasisText(selected)}</Text>
          <Text style={GlobalStyle.mutedText}>
            De første 3 mdr.: {formatPrice(Math.round(selected.quarterlyPrice))}
          </Text>
        </View>
      </Reveal>

      {match.savingPerMonth > 0 && selected === bestOffer && (
        <Text style={[GlobalStyle.savingText, GlobalStyle.paragraph]}>
          Du sparer {formatPrice(Math.round(match.savingPerMonth))} i forhold til dit nuværende
          medlemskab.
        </Text>
      )}

      {/* Advarsler og Spar mere før knappen, så man ser dem, inden man tilmelder sig. */}
      <View style={GlobalStyle.paragraph}>{notices}</View>

      <View style={GlobalStyle.choiceList}>
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
          title="Spørg Ronnie om dette Center"
          type="text"
          ronnie
          onPress={handleAskRonnie}
        />
      </View>

      {/* Udregningen bag prisen (kvitteringen) er foldet sammen fra start. */}
      <ButtonComponent
        title={showReceipt ? 'Skjul udregningen' : 'Se udregningen'}
        type="ghost"
        icon={showReceipt ? 'chevron-up' : 'chevron-down'}
        onPress={() => setShowReceipt((open) => !open)}
      />
      {showReceipt && (
        <Reveal key={selected.offer.id} distance={16} style={GlobalStyle.paragraph}>
          <OfferReceipt
            pricedOffer={selected}
            chain={chain}
            user={user}
            isCheapest={selected === bestOffer && offers.length > 1}
          />
        </Reveal>
      )}

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
