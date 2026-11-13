import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import CenterTitle, { centerTitleLabel } from './CenterTitle';
import FacilityTags from './FacilityTags';
import FavoriteButton from './FavoriteButton';
import HonestPrice from './HonestPrice';
import InfoButton from './InfoButton';
import NotStatedRow from './NotStatedRow';
import Reveal from './Reveal';
import { centerDisplayName } from '../data/centerDisplayName';
import { formatDistance, formatPrice, offerBasisText } from '../data/centerDetail';
import {
  FACILITY_TAG_ROW_LIMIT,
  chainCardOffer,
  facilityTags,
  notStatedWithoutFacilities,
  otherCentersLabel,
} from '../data/findView';
import { openSignupPage } from '../services/Signup';

// Kort for én Kæde i listen på Find (chainMatch er et ChainMatch fra Matchning). Kortet viser
// Kædens bedste Center: titel (logo, pin, navn), afstand, Ærlig årspris for det Tilbud, Centret er
// rangeret på (det billigste, der med sikkerhed matcher, eller det billigste, hvis intet gør; se
// chainCardOffer), som et stort tal med Tilbuddets adgang og produktnavn (og Rabat),
// facilitetsmærker (ønskede først, højst 6 og "+N mere"; filters er de aktive Filtre),
// "Ikke oplyst" for binding,
// abonnementstype og maskiner og "Du sparer". ♥ og "Tilmeld" gælder Kædens bedste Center
// og samme Tilbud. Titlen og "Om centret"
// åbner Centerdetalje. Nederst kan Kædens andre matchende Centre foldes ud; hver række viser kort
// navn, afstand, ærlig årspris ("kr. pr. md." og "ærlig årspris" ⓘ som på kortet) og højst 4 facilitetsmærker og åbner Centerdetalje (rækkerne har ingen Tilmeld). Det
// Anbefalede Center er en mørk blok med prisen i lyst blæk, så listen får en rytme i stedet for
// ens kort. index er pladsen i listen; kortene toner ind forskudt efter den (den vises ikke, så den
// ikke ligner en rangering). onShowDetails(centerId) åbner Centerdetalje.
export default function ChainCard({
  chainMatch,
  filters,
  isRecommended,
  onShowDetails,
  index = 0,
}) {
  const [showOthers, setShowOthers] = useState(false);
  const { best: match, others } = chainMatch;
  const { center, chain } = match;
  const shown = chainCardOffer(match);
  const distance = match.distanceKm != null ? `${formatDistance(match.distanceKm)} fra dig` : null;
  const ink = isRecommended;
  const showBest = () => onShowDetails(center.id);

  return (
    <Reveal index={index}>
      <View style={[GlobalStyle.card, ink && GlobalStyle.cardHighlighted]}>
        {isRecommended && (
          <View style={GlobalStyle.cardTopRow}>
            <View style={[GlobalStyle.badge, GlobalStyle.badgeInline]}>
              <Text style={GlobalStyle.badgeText}>Anbefalet</Text>
            </View>
            <InfoButton term="recommended" onInk={ink} />
          </View>
        )}
        <View style={GlobalStyle.cardHeader}>
          <View style={GlobalStyle.cardTitleArea}>
            {/* Titlen (logo, pin, navn) og pilen; skærmlæseren hører "Kæde, Centernavn". */}
            <Pressable
              onPress={showBest}
              accessibilityRole="button"
              accessibilityLabel={centerTitleLabel(chain, center.name)}
              accessibilityHint="Åbner detaljer om centret"
              style={({ pressed }) => [
                GlobalStyle.cardTitleButton,
                pressed && GlobalStyle.cardPressed,
              ]}
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

        <HonestPrice amount={shown.honestYearlyPrice} size="card" onInk={ink} />
        {/* Hvilket Tilbud prisen og Tilmeld gælder, og om en Rabat er regnet med. */}
        <Text style={[GlobalStyle.mutedText, ink && GlobalStyle.mutedOnInk]}>
          {offerBasisText(shown.priced, chain?.name)}
        </Text>
        <FacilityTags result={facilityTags(center, filters)} onInk={ink} expandable />
        <NotStatedRow notStated={notStatedWithoutFacilities(shown.notStated)} onInk={ink} />
        {shown.savingPerMonth != null && shown.savingPerMonth > 0 && (
          <Text style={[GlobalStyle.savingText, GlobalStyle.paragraph]}>
            Du sparer {formatPrice(Math.round(shown.savingPerMonth))} i forhold til dit nuværende
            medlemskab
          </Text>
        )}

        <View style={GlobalStyle.cardActions}>
          <ButtonComponent
            title="Om centret"
            type="text"
            size="small"
            onInk={ink}
            onPress={showBest}
          />
          <ButtonComponent
            title="Tilmeld"
            type="primary"
            size="small"
            icon="open-outline"
            // Det Tilbud, kortet viser.
            onPress={() => openSignupPage(center, chain, shown.priced)}
          />
        </View>

        {others.length > 0 && (
          <View style={[GlobalStyle.chainOthers, ink && GlobalStyle.chainOthersOnInk]}>
            <ButtonComponent
              title={otherCentersLabel(others.length, chainMatch.chain)}
              type="text"
              size="small"
              icon={showOthers ? 'chevron-up' : 'chevron-down'}
              onInk={ink}
              onPress={() => setShowOthers(!showOthers)}
            />
            {showOthers &&
              others.map((other) => (
                <OtherCenterRow
                  key={other.center.id}
                  match={other}
                  filters={filters}
                  onInk={ink}
                  onPress={() => onShowDetails(other.center.id)}
                />
              ))}
          </View>
        )}
      </View>
    </Reveal>
  );
}

// Én af Kædens andre Centre: kort navn, afstand, ærlig årspris (for det Tilbud, Centret er
// rangeret på, som på kortet) og højst 4 facilitetsmærker. Et
// tryk åbner Centerdetalje, så "+N mere" kan ikke trykkes her. Skærmlæseren hører mærkerne som en
// del af rækken.
function OtherCenterRow({ match, filters, onInk, onPress }) {
  const { center, chain } = match;
  const name = centerDisplayName(center.name, chain);
  const distance = match.distanceKm != null ? formatDistance(match.distanceKm) : 'Afstand ukendt';
  const price = formatPrice(Math.round(chainCardOffer(match).honestYearlyPrice));
  const tags = facilityTags(center, filters, { limit: FACILITY_TAG_ROW_LIMIT });
  const tagsLabel = tags.tags.map((tag) => `, ${tag.accessibilityLabel}`).join('');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${distance}, ${price}, ærlig årspris${tagsLabel}`}
      accessibilityHint="Åbner detaljer om centret"
      style={({ pressed }) => [GlobalStyle.chainOtherRow, pressed && GlobalStyle.cardPressed]}
    >
      <View style={GlobalStyle.fill}>
        <Text
          style={[GlobalStyle.chainOtherName, onInk && GlobalStyle.textOnInk]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={[GlobalStyle.mutedText, onInk && GlobalStyle.mutedOnInk]}>{distance}</Text>
        <FacilityTags result={tags} onInk={onInk} />
      </View>
      {/* Samme tal og ord som HonestPrice på kortet: "249 kr. pr. md." og "ærlig årspris" ⓘ. */}
      <View style={GlobalStyle.chainOtherPriceBox}>
        <Text style={[GlobalStyle.chainOtherPrice, onInk && GlobalStyle.textOnInk]}>{price}</Text>
        <View style={GlobalStyle.inlineRow}>
          <Text style={[GlobalStyle.cardPriceCaption, onInk && GlobalStyle.mutedOnInk]}>
            ærlig årspris
          </Text>
          <InfoButton term="honestYearlyPrice" onInk={onInk} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={onInk ? colors.onInk : colors.text} />
    </Pressable>
  );
}
