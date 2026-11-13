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
  aboutCenterRows,
  formatDistance,
  formatKr,
  formatNumber,
  formatPrice,
  chainGenitive,
  matchCenter,
  offerAccessPhrase,
  offerBasisText,
  offerLabels,
  savingSuggestionText,
  turns30Notice,
} from '../data/centerDetail';
import { centerQuestion } from '../data/ronnie';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { openSignupPage } from '../services/Signup';

// Centerdetalje: titel (Kæde og navn), adresse og Distance, og Centrets Tilbud som faner. Øverst
// står prisen for det valgte Tilbud (Ærlig årspris og de første 3 måneder), så 30-års-advarsel og
// Spar mere-forslag, og derefter "Tilmeld dig", der åbner tilmeldingen til det valgte Tilbud.
// Tilbuddene beskrives ved den adgang, de giver (fx "Kun dette center"); Kædens produktnavn står
// kun på fanen, når to Tilbud ellers ville se ens ud (se offerLabels), og på kvitteringen.
// Udregningen bag prisen (kvitteringen, se OfferReceipt) er foldet sammen under "Se udregningen".
// Priserne kommer fra Matchning, så de er de samme som på Find. Fra start er det billigste Tilbud
// for brugeren valgt. ♥ i titelrækken gør Centret til Favorit. Nederst står tabellen "Om centret"
// (adresse, adgang, Binding for det valgte Tilbud og faciliteter) og "Spørg Ronnie". Prisen toner ind på ny, når et andet Tilbud vælges, så skiftet kan ses.
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
          {center ? 'Centret har ingen abonnementer lige nu.' : 'Centret blev ikke fundet.'}
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
  const ageNotice =
    turns30Notice(user.birthDate, bestOffer) ??
    offers.map((priced) => turns30Notice(user.birthDate, priced)).find(Boolean);
  // Tilbuddene beskrives ved den adgang, de giver; produktnavnet står kun som ekstra info.
  const labels = offerLabels(offers, chain?.name);
  const ageOffer = ageNotice && offers.find((priced) => priced.offer.id === ageNotice.offerId);
  const ageOfferText =
    ageOffer &&
    `${offerAccessPhrase(ageOffer.offer, chain?.name)}${
      labels[ageOffer.offer.id]?.ambiguous ? ` (${ageOffer.offer.name})` : ''
    }`;

  const selected = offers.find((priced) => priced.offer.id === selectedOfferId) ?? bestOffer;
  const aboutRows = aboutCenterRows({ center, chain, offers, selectedOffer: selected });
  const hasNotStated = aboutRows.some((row) => row.status === 'notStated');
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
            for {ageOfferText ?? ageNotice.offerName} fra {formatKr(ageNotice.priceBefore)} til{' '}
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
          <Text style={GlobalStyle.bodyText}>{savingSuggestionText(suggestion)}</Text>
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
                  {labels[priced.offer.id].label}
                </Text>
                {labels[priced.offer.id].ambiguous && (
                  <Text
                    style={[GlobalStyle.offerTabPrice, active && GlobalStyle.offerTabPriceActive]}
                  >
                    {priced.offer.name}
                  </Text>
                )}
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

      {/* Prisen for det valgte Tilbud øverst, så den og Tilmeld ses med det samme. Prisen og
          kvitteringen har hver sin key: med samme key kunne React forveksle de to Reveal, når
          kvitteringen lukkes, så prisblokken stod der to gange. */}
      <Reveal key={`pris-${selected.offer.id}`} distance={12}>
        <View style={GlobalStyle.detailPrice}>
          <View style={GlobalStyle.cardPriceRow}>
            <Text style={GlobalStyle.cardPrice}>
              {formatNumber(Math.round(selected.honestYearlyPrice))}
            </Text>
            <View style={GlobalStyle.cardPriceUnitBox}>
              <Text style={GlobalStyle.cardPriceUnit}>kr. pr. md.</Text>
              <View style={GlobalStyle.inlineRow}>
                <Text style={GlobalStyle.cardPriceCaption}>ærlig årspris</Text>
                <InfoButton term="honestYearlyPrice" />
              </View>
            </View>
          </View>
          <Text style={GlobalStyle.mutedText}>{offerBasisText(selected, chain?.name)}</Text>
          <View style={GlobalStyle.inlineRow}>
            <Text style={GlobalStyle.mutedText}>
              De første 3 måneder: {formatPrice(Math.round(selected.quarterlyPrice))} i snit
            </Text>
            <InfoButton term="quarterlyPrice" />
          </View>
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
          title="Tilmeld dig"
          type="primary"
          icon="open-outline"
          full
          onPress={() => openSignupPage(center, chain, selected)}
        />
        <Text style={[GlobalStyle.mapLegend, GlobalStyle.centeredText]}>
          Åbner {chainGenitive(chain?.name)} egen side.
        </Text>
      </View>

      {/* Udregningen bag prisen (kvitteringen) er foldet sammen fra start. */}
      <ButtonComponent
        title={showReceipt ? 'Skjul udregningen' : 'Se udregningen'}
        type="ghost"
        icon={showReceipt ? 'chevron-up' : 'chevron-down'}
        onPress={() => setShowReceipt((open) => !open)}
      />
      {showReceipt && (
        <Reveal key={`udregning-${selected.offer.id}`} distance={16} style={GlobalStyle.paragraph}>
          <OfferReceipt
            pricedOffer={selected}
            chain={chain}
            user={user}
            isCheapest={selected === bestOffer && offers.length > 1}
          />
        </Reveal>
      )}

      {/* Tabellen "Om centret": kun data, vi har. Bindingen følger det valgte Tilbud. Under
          tabellen forklares "Ikke oplyst", kun når en række ikke er oplyst. */}
      <Text style={GlobalStyle.sectionLabel}>Om centret</Text>
      <View style={[GlobalStyle.aboutTable, !hasNotStated && GlobalStyle.paragraph]}>
        {aboutRows.map((row, index) => (
          <View
            key={row.key}
            style={[GlobalStyle.aboutRow, index > 0 && GlobalStyle.aboutRowDivider]}
          >
            <Text style={GlobalStyle.aboutLabel}>{row.label}</Text>
            <Text style={GlobalStyle.aboutValue}>{row.value}</Text>
          </View>
        ))}
      </View>
      {hasNotStated && (
        <View style={[GlobalStyle.inlineRow, GlobalStyle.paragraph]}>
          <Text style={GlobalStyle.mapLegend}>Ikke oplyst = kæden har ikke sagt det</Text>
          <InfoButton term="notStated" />
        </View>
      )}

      {/* Ronnie står nederst, langt fra prisen: han er aldrig med ved priser. */}
      <ButtonComponent
        title="Spørg Ronnie om dette center"
        type="text"
        ronnie
        onPress={handleAskRonnie}
      />
    </ScrollView>
  );
}
