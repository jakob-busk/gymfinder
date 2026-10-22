import { useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import { NOT_STATED_LABELS } from '../data/matchning';

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
  if (pricedOffer.adminFee > 0) {
    lines.push(`Heraf ${kr(pricedOffer.adminFee)} i admingebyr pr. betaling.`);
  }
  if (pricedOffer.signupFee > 0) {
    lines.push(`Oprettelsesgebyr på ${kr(pricedOffer.signupFee)} er fordelt over året.`);
  }
  if (pricedOffer.turns30InMonth != null) {
    lines.push(`Du fylder 30, så prisen stiger fra måned ${pricedOffer.turns30InMonth}.`);
  }
  if (pricedOffer.partnerRequirement && pricedOffer.yearlyOption.kind === 'partner') {
    lines.push(`Makkerpris pr. person. Krav: ${pricedOffer.partnerRequirement}`);
  }
  return lines;
}

// Kort for ét Center i listen. Viser Ærlig årspris for det billigste Tilbud for brugeren.
export default function CenterCard({ match, isRecommended }) {
  const [expanded, setExpanded] = useState(false);
  const { center, chain, bestOffer } = match;
  const binding = bestOffer.bindingMonths;

  return (
    <View style={GlobalStyle.card}>
      <View style={GlobalStyle.cardHeader}>
        <Text style={GlobalStyle.cardTitle}>{center.name}</Text>
        {isRecommended && (
          <View style={GlobalStyle.badge}>
            <Text style={GlobalStyle.badgeText}>ANBEFALET</Text>
          </View>
        )}
      </View>

      <Text style={GlobalStyle.priceText}>{kr(match.honestYearlyPrice)}/md (ærlig årspris)</Text>
      <Text style={GlobalStyle.distanceText}>
        Kvartalspris {kr(match.quarterlyPrice)}/md
        {match.distanceKm != null ? ` · ${match.distanceKm.toFixed(1)} km fra dig` : ''}
      </Text>
      {match.notStated.length > 0 && (
        <Text style={GlobalStyle.notStatedText}>
          Ikke oplyst: {match.notStated.map((key) => NOT_STATED_LABELS[key]).join(', ')}
        </Text>
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
          <Text>
            Binding: {binding == null ? 'Ikke oplyst' : binding === 0 ? 'Ingen' : `${binding} mdr.`}
          </Text>

          {match.savingSuggestions.map((suggestion) => (
            <View key={suggestion.discountGroup}>
              <Text style={GlobalStyle.detailsHeading}>Spar mere</Text>
              <Text>
                Bliv {suggestion.label} for {suggestion.membershipPricePerYear} kr/år og spar{' '}
                {kr(suggestion.savingPerYear)}/år her.
              </Text>
            </View>
          ))}
        </View>
      )}

      <ButtonComponent
        title="Gå til tilmelding"
        type="primary"
        onPress={() => Linking.openURL(center.signupUrl ?? chain?.website)}
      />
    </View>
  );
}
