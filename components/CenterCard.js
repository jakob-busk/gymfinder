import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import CenterTitle, { centerTitleLabel } from './CenterTitle';
import FavoriteButton from './FavoriteButton';
import InfoButton from './InfoButton';
import NotStatedRow from './NotStatedRow';
import Reveal from './Reveal';
import { formatDistance, formatNumber, formatPrice } from '../data/centerDetail';
import { openSignupPage } from '../services/Signup';

// Kort for ét Center i listen: titel (logo, pin, navn), afstand, Ærlig årspris for det billigste
// Tilbud for brugeren som et stort tal og "Tilmeld". Hele kortet åbner Centerdetalje (pilen til
// højre viser det); ♥ gør Centret til Favorit. Detaljer som de første 3 mdr. står på
// Centerdetalje, så kortet holdes kort. Det Anbefalede Center er en mørk blok med prisen i lyst
// blæk, så listen får en rytme i stedet for ens kort. index er pladsen i listen; kortene toner ind
// forskudt efter den (den vises ikke, så den ikke ligner en rangering).
export default function CenterCard({ match, isRecommended, onShowDetails, index = 0 }) {
  const { center, chain, bestOffer } = match;
  const distance = match.distanceKm != null ? `${formatDistance(match.distanceKm)} fra dig` : null;
  const ink = isRecommended;

  return (
    <Reveal index={index}>
      {/* Hele kortet kan trykkes. Det er ikke selv et element for skærmlæsere (så ♥ og Tilmeld
          stadig kan nås); titlen er knappen, der læses op. */}
      <Pressable
        onPress={onShowDetails}
        accessible={false}
        style={({ pressed }) => [
          GlobalStyle.card,
          ink && GlobalStyle.cardHighlighted,
          pressed && GlobalStyle.cardPressed,
        ]}
      >
        {isRecommended && (
          <View style={GlobalStyle.cardTopRow}>
            <View style={[GlobalStyle.badge, GlobalStyle.badgeInline]}>
              <Text style={GlobalStyle.badgeText}>Anbefalet</Text>
            </View>
          </View>
        )}
        <View style={GlobalStyle.cardHeader}>
          <View style={GlobalStyle.cardTitleArea}>
            {/* Titlen (logo, pin, navn) og pilen; skærmlæseren hører "Kæde, Centernavn". */}
            <Pressable
              onPress={onShowDetails}
              accessibilityRole="button"
              accessibilityLabel={centerTitleLabel(chain, center.name)}
              accessibilityHint="Åbner detaljer om Centret"
              style={GlobalStyle.cardTitleButton}
            >
              <View style={GlobalStyle.fill}>
                <CenterTitle chain={chain} name={center.name} onInk={ink} labelled={false} />
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={ink ? colors.onInk : colors.text}
                style={GlobalStyle.cardChevron}
              />
            </Pressable>
            {distance && (
              <Text style={[GlobalStyle.mutedText, ink && GlobalStyle.mutedOnInk]}>{distance}</Text>
            )}
          </View>
          <FavoriteButton center={center} chain={chain} onInk={ink} />
        </View>

        <View style={GlobalStyle.cardPriceRow}>
          <Text style={[GlobalStyle.cardPrice, ink && GlobalStyle.priceOnInk]}>
            {formatNumber(Math.round(match.honestYearlyPrice))}
          </Text>
          <View style={GlobalStyle.cardPriceUnitBox}>
            <Text style={[GlobalStyle.cardPriceUnit, ink && GlobalStyle.textOnInk]}>
              kr. pr. md.
            </Text>
            <View style={GlobalStyle.inlineRow}>
              <Text style={[GlobalStyle.cardPriceCaption, ink && GlobalStyle.mutedOnInk]}>
                ærlig årspris
              </Text>
              <InfoButton term="honestYearlyPrice" />
            </View>
          </View>
        </View>
        <NotStatedRow notStated={match.notStated} onInk={ink} />
        {match.savingPerMonth != null && match.savingPerMonth > 0 && (
          <Text style={[GlobalStyle.savingText, GlobalStyle.paragraph]}>
            Du sparer {formatPrice(Math.round(match.savingPerMonth))} i forhold til dit nuværende
            medlemskab
          </Text>
        )}

        <View style={GlobalStyle.cardActions}>
          <ButtonComponent
            title="Tilmeld"
            type="primary"
            size="small"
            icon="open-outline"
            // Det billigste Tilbud for brugeren, som kortet viser.
            onPress={() => openSignupPage(center, chain, bestOffer)}
          />
        </View>
      </Pressable>
    </Reveal>
  );
}
