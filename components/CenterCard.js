import { View, Text, Pressable } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import FavoriteButton from './FavoriteButton';
import InfoButton from './InfoButton';
import NotStatedRow from './NotStatedRow';
import { openSignupPage } from '../services/Signup';

const kr = (amount) => `${Math.round(amount)} kr`;

// Kort for ét Center i listen: navn, Ærlig årspris for det billigste Tilbud for brugeren, og kun
// to handlinger: "Se detaljer" (åbner Centerdetalje, ligesom et tryk på navnet) og "Tilmeld".
// ♥ gør Centret til Favorit. Detaljerne om tilbuddet står på Centerdetalje.
export default function CenterCard({ match, isRecommended, onShowDetails }) {
  const { center, chain, bestOffer } = match;
  const details = [
    chain?.name,
    match.distanceKm != null ? `${match.distanceKm.toFixed(1)} km fra dig` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[GlobalStyle.card, isRecommended && GlobalStyle.cardHighlighted]}>
      <View style={GlobalStyle.cardHeader}>
        <Pressable
          style={GlobalStyle.cardTitleArea}
          onPress={onShowDetails}
          accessibilityRole="button"
        >
          {isRecommended && (
            <View style={[GlobalStyle.badge, GlobalStyle.badgeInline]}>
              <Text style={GlobalStyle.badgeText}>ANBEFALET</Text>
            </View>
          )}
          <Text style={GlobalStyle.cardTitle}>{center.name}</Text>
          <Text style={GlobalStyle.mutedText}>{details}</Text>
        </Pressable>
        <FavoriteButton center={center} chain={chain} />
      </View>

      <View style={GlobalStyle.cardPriceRow}>
        <Text style={GlobalStyle.cardPrice}>{kr(match.honestYearlyPrice)}</Text>
        <Text style={GlobalStyle.cardPriceUnit}>/md · ærlig årspris</Text>
        <InfoButton term="honestYearlyPrice" />
      </View>
      <Text style={GlobalStyle.mutedText}>De første 3 mdr. {kr(match.quarterlyPrice)}/md</Text>
      <NotStatedRow notStated={match.notStated} />
      {match.savingPerMonth != null && match.savingPerMonth > 0 && (
        <Text style={[GlobalStyle.savingText, GlobalStyle.paragraph]}>
          Du sparer {kr(match.savingPerMonth)}/md i forhold til dit nuværende medlemskab
        </Text>
      )}

      <View style={GlobalStyle.cardActions}>
        {onShowDetails && (
          <ButtonComponent title="Se detaljer" type="text" size="small" onPress={onShowDetails} />
        )}
        <ButtonComponent
          title="Tilmeld"
          type="primary"
          size="small"
          icon="open-outline"
          // Det billigste Tilbud for brugeren, som kortet viser.
          onPress={() => openSignupPage(center, chain, bestOffer)}
        />
      </View>
    </View>
  );
}
