import { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import FavoriteButton from './FavoriteButton';
import InfoButton from './InfoButton';
import { NOT_STATED_LABELS } from '../data/matchning';
import { openSignupPage } from '../services/Signup';

const kr = (amount) => `${Math.round(amount)} kr`;

// Kort tekst om hvordan Ærlig årspris er regnet ud for det billigste Tilbud.
function priceLines(pricedOffer) {
  const lines = [`Billigst for dig: ${pricedOffer.yearlyOption.label}.`];
  const first = pricedOffer.monthlyBreakdown[0];
  const last = pricedOffer.monthlyBreakdown[pricedOffer.monthlyBreakdown.length - 1];
  const perPeriod = pricedOffer.paymentsPerYear === 12 ? 'md' : '30 dage';

  if (first.total === last.total) {
    lines.push(`${kr(first.total)}/${perPeriod} hele året.`);
  } else {
    lines.push(
      `Starter på ${kr(first.total)}/${perPeriod}, derefter ${kr(last.total)}/${perPeriod}.`,
    );
  }
  if (pricedOffer.signupFee > 0) {
    lines.push(`Oprettelsesgebyr på ${kr(pricedOffer.signupFee)} er fordelt over året.`);
  }
  if (pricedOffer.turns30InMonth != null) {
    lines.push(`Du fylder 30, så prisen stiger fra måned ${pricedOffer.turns30InMonth}.`);
  }
  if (pricedOffer.partnerRequirement && pricedOffer.yearlyOption.kind === 'partner') {
    lines.push(`Krav for Makkerpris: ${pricedOffer.partnerRequirement}`);
  }
  return lines;
}

// Kort for ét Center i listen. Viser Ærlig årspris for det billigste Tilbud for brugeren, og ♥
// gør Centret til Favorit.
// onShowDetails kaldes ved tryk på "Se mere" (åbner Centerdetalje).
export default function CenterCard({ match, isRecommended, onShowDetails }) {
  const [expanded, setExpanded] = useState(false);
  const { center, chain, bestOffer } = match;
  const binding = bestOffer.bindingMonths;

  const handleSignup = async () => {
    try {
      await openSignupPage(center, chain);
    } catch (error) {
      Alert.alert('Kunne ikke åbne tilmeldingen', error.message);
    }
  };

  return (
    <View style={GlobalStyle.card}>
      <View style={GlobalStyle.cardHeader}>
        <Text style={[GlobalStyle.cardTitle, GlobalStyle.shrinkText]}>{center.name}</Text>
        <View style={GlobalStyle.inlineRow}>
          {isRecommended && (
            <View style={GlobalStyle.badge}>
              <Text style={GlobalStyle.badgeText}>ANBEFALET</Text>
            </View>
          )}
          <FavoriteButton center={center} chain={chain} />
        </View>
      </View>

      <View style={GlobalStyle.inlineRow}>
        <Text style={GlobalStyle.priceText}>{kr(match.honestYearlyPrice)}/md (ærlig årspris)</Text>
        <InfoButton term="honestYearlyPrice" />
      </View>
      <View style={GlobalStyle.inlineRow}>
        <Text style={GlobalStyle.distanceText}>
          Kvartalspris {kr(match.quarterlyPrice)}/md
          {match.distanceKm != null ? ` · ${match.distanceKm.toFixed(1)} km fra dig` : ''}
        </Text>
        <InfoButton term="quarterlyPrice" />
      </View>
      {match.notStated.length > 0 && (
        <View style={GlobalStyle.inlineRow}>
          <Text style={GlobalStyle.notStatedText}>
            Ikke oplyst: {match.notStated.map((key) => NOT_STATED_LABELS[key]).join(', ')}
          </Text>
          <InfoButton term="notStated" />
        </View>
      )}
      {match.savingPerMonth != null && match.savingPerMonth > 0 && (
        <Text style={GlobalStyle.savingText}>
          Du sparer {kr(match.savingPerMonth)}/md i forhold til dit nuværende medlemskab
        </Text>
      )}

      <Pressable onPress={() => setExpanded(!expanded)}>
        <Text style={GlobalStyle.link}>Om tilbuddet {expanded ? '↑' : '↓'}</Text>
      </Pressable>

      {expanded && (
        <View style={GlobalStyle.detailsBox}>
          <Text style={GlobalStyle.detailsHeading}>
            {chain?.name} · {bestOffer.offer.name} ({bestOffer.offer.subscriptionType})
          </Text>
          <Text>{priceLines(bestOffer).join(' ')}</Text>
          {bestOffer.adminFee > 0 && (
            <View style={GlobalStyle.inlineRow}>
              <Text>Heraf admingebyr: {kr(bestOffer.adminFee)} pr. betaling</Text>
              <InfoButton term="adminFee" />
            </View>
          )}
          {bestOffer.yearlyOption.kind === 'partner' && (
            <View style={GlobalStyle.inlineRow}>
              <Text>Prisen er Makkerpris pr. person</Text>
              <InfoButton term="partnerPrice" />
            </View>
          )}
          <View style={GlobalStyle.inlineRow}>
            <Text>
              Binding:{' '}
              {binding == null ? 'Ikke oplyst' : binding === 0 ? 'Ingen' : `${binding} mdr.`}
            </Text>
            <InfoButton term="binding" />
          </View>

          {match.savingSuggestions.map((suggestion) => (
            <View key={suggestion.discountGroup}>
              <View style={GlobalStyle.inlineRow}>
                <Text style={GlobalStyle.detailsHeading}>Spar mere</Text>
                <InfoButton term="savingSuggestion" />
              </View>
              <Text>
                Bliv {suggestion.label} for {suggestion.membershipPricePerYear} kr/år og spar{' '}
                {kr(suggestion.savingPerYear)}/år her.
              </Text>
            </View>
          ))}
        </View>
      )}

      {onShowDetails && (
        <Pressable onPress={onShowDetails}>
          <Text style={GlobalStyle.link}>Se mere →</Text>
        </Pressable>
      )}

      <ButtonComponent
        title="Gå til tilmelding"
        type="primary"
        onPress={handleSignup}
      />
    </View>
  );
}
