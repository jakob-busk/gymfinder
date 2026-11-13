import { View, Text, Pressable } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import FavoriteButton from './FavoriteButton';
import InfoButton from './InfoButton';
import NotStatedRow from './NotStatedRow';
import Reveal from './Reveal';
import { openSignupPage } from '../services/Signup';

const kr = (amount) => `${Math.round(amount)} kr`;

// Kort for ét Center i listen: løbenummer, navn, Ærlig årspris for det billigste Tilbud for
// brugeren som et stort tal, og kun to handlinger: "Se detaljer" (åbner Centerdetalje, ligesom et
// tryk på navnet) og "Tilmeld". ♥ gør Centret til Favorit. Detaljerne om tilbuddet står på
// Centerdetalje. Det Anbefalede Center er en mørk blok med prisen i mint, så listen får en rytme
// i stedet for ens kort. index er pladsen i listen; kortene toner ind forskudt efter den.
export default function CenterCard({ match, isRecommended, onShowDetails, index = 0 }) {
  const { center, chain, bestOffer } = match;
  const details = [
    chain?.name,
    match.distanceKm != null ? `${match.distanceKm.toFixed(1)} km fra dig` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const ink = isRecommended;

  return (
    <Reveal index={index}>
      <View style={[GlobalStyle.card, ink && GlobalStyle.cardHighlighted]}>
        <View style={GlobalStyle.cardTopRow}>
          <Text style={GlobalStyle.cardIndex}>{String(index + 1).padStart(2, '0')}</Text>
          {isRecommended && (
            <View style={[GlobalStyle.badge, GlobalStyle.badgeInline]}>
              <Text style={GlobalStyle.badgeText}>Anbefalet</Text>
            </View>
          )}
        </View>
        <View style={GlobalStyle.cardHeader}>
          <Pressable
            style={GlobalStyle.cardTitleArea}
            onPress={onShowDetails}
            accessibilityRole="button"
          >
            <Text style={[GlobalStyle.cardTitle, ink && GlobalStyle.textOnInk]}>{center.name}</Text>
            <Text style={[GlobalStyle.mutedText, ink && GlobalStyle.mutedOnInk]}>{details}</Text>
          </Pressable>
          <FavoriteButton center={center} chain={chain} onInk={ink} />
        </View>

        <View style={GlobalStyle.cardPriceRow}>
          <Text style={[GlobalStyle.cardPrice, ink && GlobalStyle.priceOnInk]}>
            {Math.round(match.honestYearlyPrice)}
          </Text>
          <View style={GlobalStyle.cardPriceUnitBox}>
            <Text style={[GlobalStyle.cardPriceUnit, ink && GlobalStyle.textOnInk]}>kr/md</Text>
            <View style={GlobalStyle.inlineRow}>
              <Text style={[GlobalStyle.cardPriceCaption, ink && GlobalStyle.mutedOnInk]}>
                ærlig årspris
              </Text>
              <InfoButton term="honestYearlyPrice" />
            </View>
          </View>
        </View>
        <Text style={[GlobalStyle.mutedText, ink && GlobalStyle.mutedOnInk]}>
          De første 3 mdr. {kr(match.quarterlyPrice)}/md
        </Text>
        <NotStatedRow notStated={match.notStated} onInk={ink} />
        {match.savingPerMonth != null && match.savingPerMonth > 0 && (
          <Text style={[GlobalStyle.savingText, GlobalStyle.paragraph]}>
            Du sparer {kr(match.savingPerMonth)}/md i forhold til dit nuværende medlemskab
          </Text>
        )}

        <View style={GlobalStyle.cardActions}>
          {onShowDetails && (
            <ButtonComponent
              title="Se detaljer"
              type="text"
              size="small"
              onInk={ink}
              onPress={onShowDetails}
            />
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
    </Reveal>
  );
}
