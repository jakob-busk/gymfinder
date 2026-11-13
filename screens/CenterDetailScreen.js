// Ansvarlig: Christian
import { useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import InfoButton from '../components/InfoButton';
import CenterDetailPrototype, {
  CENTER_DETAIL_VARIANTS,
} from '../components/CenterDetailPrototype';
import PrototypeSwitcher from '../components/PrototypeSwitcher';
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
// ♥ i titelrækken gør Centret til Favorit.
// PROTOTYPE: indholdet vises lige nu som en af varianterne i components/CenterDetailPrototype.js.
export default function CenterDetailScreen({ navigation, route }) {
  const centerId = route?.params?.centerId;
  const { user } = useContext(UserContext);
  const { centers, chains, loading } = useCenterData();
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  // PROTOTYPE: hvilken variant af Centerdetalje der vises.
  const [variant, setVariant] = useState('A');
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
          <Text style={GlobalStyle.warningTitle}>Prisen stiger, når du fylder 30</Text>
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

  // PROTOTYPE: varianterne af Centerdetalje (se components/CenterDetailPrototype.js).
  return (
    <View style={GlobalStyle.screen}>
      <CenterDetailPrototype
        variant={variant}
        center={center}
        chain={chain}
        match={match}
        user={user}
        offers={offers}
        bestOffer={bestOffer}
        selected={selected}
        onSelect={setSelectedOfferId}
        facilities={facilities}
        distance={distance}
        notices={notices}
        hasNotices={Boolean(ageNotice) || match.savingSuggestions.length > 0}
        onSignup={() => openSignupPage(center, chain, selected)}
        onAskRonnie={handleAskRonnie}
      />
      <PrototypeSwitcher
        variants={CENTER_DETAIL_VARIANTS}
        current={variant}
        onChange={setVariant}
      />
    </View>
  );
}
