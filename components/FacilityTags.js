import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';

// Facilitetsmærker på et kæde-kort (result er facilityTags fra data/findView). Farver efter
// ADR 0006, uden nye accentfarver: ønsket = blæk-pille med ✓, ikke oplyst = stiplet blæk-kant med
// "?", andre = dæmpet tekst uden kant. onInk vender farverne om på den mørke Anbefalet-blok.
// expandable: "+N mere" kan trykkes og viser så alle mærker; ellers er det kun en tekst (rækkerne
// for Kædens andre Centre, hvor et tryk åbner Centerdetalje). Hvert mærke har sin egen
// skærmlæser-tekst (fx "Sauna, ønsket").
export default function FacilityTags({ result, onInk = false, expandable = false }) {
  const [showAll, setShowAll] = useState(false);
  const tags = showAll ? result.tags : result.visible;
  if (tags.length === 0) return null;
  const hiddenCount = showAll ? 0 : result.hiddenCount;

  return (
    <View style={GlobalStyle.facilityTagRow}>
      {tags.map((tag) => (
        <FacilityTag key={tag.key} tag={tag} onInk={onInk} />
      ))}
      {hiddenCount > 0 &&
        (expandable ? (
          <Pressable
            onPress={() => setShowAll(true)}
            accessibilityRole="button"
            accessibilityLabel={`Vis ${hiddenCount} faciliteter mere`}
            hitSlop={8}
            style={({ pressed }) => [GlobalStyle.facilityTag, pressed && GlobalStyle.cardPressed]}
          >
            <Text style={[GlobalStyle.facilityTagMore, onInk && GlobalStyle.textOnInk]}>
              +{hiddenCount} mere
            </Text>
          </Pressable>
        ) : (
          <View style={GlobalStyle.facilityTag}>
            <Text style={[GlobalStyle.facilityTagOtherText, onInk && GlobalStyle.mutedOnInk]}>
              +{hiddenCount} mere
            </Text>
          </View>
        ))}
    </View>
  );
}

function FacilityTag({ tag, onInk }) {
  const wanted = tag.status === 'wanted';
  const notStated = tag.status === 'notStated';
  // Blæk-pillen er lys på blæk-blokken; teksten i den er altid den modsatte.
  const pillText = onInk ? colors.text : colors.onInk;
  const iconColor = wanted ? pillText : onInk ? colors.onInk : colors.text;

  return (
    <View
      accessible
      accessibilityLabel={tag.accessibilityLabel}
      style={[
        GlobalStyle.facilityTag,
        wanted && (onInk ? GlobalStyle.facilityTagWantedOnInk : GlobalStyle.facilityTagWanted),
        notStated &&
          (onInk ? GlobalStyle.facilityTagNotStatedOnInk : GlobalStyle.facilityTagNotStated),
      ]}
    >
      {wanted && <Ionicons name="checkmark" size={13} color={iconColor} />}
      {notStated && <Ionicons name="help" size={13} color={iconColor} />}
      <Text
        style={[
          wanted || notStated ? GlobalStyle.facilityTagText : GlobalStyle.facilityTagOtherText,
          wanted && (onInk ? GlobalStyle.textOnPaperPill : GlobalStyle.textOnInkPill),
          !wanted && onInk && (notStated ? GlobalStyle.textOnInk : GlobalStyle.mutedOnInk),
        ]}
      >
        {tag.label}
      </Text>
    </View>
  );
}
