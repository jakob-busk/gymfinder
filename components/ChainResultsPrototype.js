// PROTOTYPE — slettes, når en variant er valgt
// Plan: tre varianter af resultatlisten på Find med ét kort pr. Kæde (A: mærker, B: "Passer til
// dig", C: hero + sammenligningstabel), skiftet med PrototypeSwitcher i screens/FindScreen.js.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors, fonts } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import FavoriteButton from './FavoriteButton';
import InfoButton from './InfoButton';
import NotStatedRow from './NotStatedRow';
import SegmentedControl from './SegmentedControl';
import { openSignupPage } from '../services/Signup';
import {
  CLOSE_PRICE_KR,
  facilitiesFor,
  groupByChain,
  isMockKey,
  wishesFor,
  wishLabel,
  wishSummary,
} from '../data/chainGroupingPrototype';

export const CHAIN_VARIANTS = [
  { key: 'A', name: 'Mærker med flueben' },
  { key: 'B', name: 'Passer til dig' },
  { key: 'C', name: 'Hero + sammenligning' },
];

const kr = (amount) => `${Math.round(amount)} kr`;
const km = (distance) => (distance != null ? `${distance.toFixed(1)} km` : 'Ukendt afstand');
const centersWord = (n) => (n === 1 ? 'Center' : 'Centre');

// ---------- Fælles småting ----------

// Lille facilitetsmærke. Ønsket + har = turkis med flueben, ønsket + ukendt = gul "?",
// ønsket + mangler = rød og overstreget, ikke ønsket = nedtonet. Fiktive (mock) får stiplet kant og *.
function FacilityChip({ item, small }) {
  const tone = !item.wanted
    ? item.value === true
      ? 'plain'
      : 'unknownPlain'
    : item.value === true
      ? 'met'
      : item.value == null
        ? 'unknown'
        : 'missing';
  const icon = { met: 'checkmark', unknown: 'help', missing: 'close' }[tone];
  return (
    <View
      style={[
        styles.chip,
        small && styles.chipSmall,
        styles[`chip_${tone}`],
        item.mock && styles.chipMock,
      ]}
    >
      {icon && <Ionicons name={icon} size={small ? 11 : 13} color={TONE_COLORS[tone]} />}
      <Text
        style={[
          styles.chipText,
          small && styles.chipTextSmall,
          { color: TONE_COLORS[tone] },
          tone === 'missing' && styles.strike,
        ]}
      >
        {item.label}
        {item.mock ? '*' : ''}
      </Text>
    </View>
  );
}

const TONE_COLORS = {
  met: colors.accentText,
  unknown: colors.warning,
  missing: colors.error,
  plain: colors.muted,
  unknownPlain: colors.muted,
};

function Badge({ text = 'ANBEFALET' }) {
  return (
    <View style={[GlobalStyle.badge, GlobalStyle.badgeInline]}>
      <Text style={GlobalStyle.badgeText}>{text}</Text>
    </View>
  );
}

function Toggle({ open, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.toggle} accessibilityRole="button">
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

function SignupButton({ match }) {
  return (
    <ButtonComponent
      title="Tilmeld"
      type="primary"
      size="small"
      icon="open-outline"
      onPress={() => openSignupPage(match.center, match.chain, match.bestOffer)}
    />
  );
}

// ---------- Variant A: kompakt kort, mærker farvet efter ønsker, "+N mere" ----------

const A_VISIBLE = 6;
const A_ROW_VISIBLE = 4;

// Mærker der vises: alle ønskede (uanset værdi) + dem Centret har. Resten skjules.
const visibleChips = (facilities) => facilities.filter((f) => f.wanted || f.value === true);

function ChipsWithMore({ facilities, limit, small }) {
  const [open, setOpen] = useState(false);
  const chips = visibleChips(facilities);
  const shown = open ? chips : chips.slice(0, limit);
  const hidden = chips.length - shown.length;
  return (
    <View style={styles.chipRow}>
      {shown.map((item) => (
        <FacilityChip key={item.key} item={item} small={small} />
      ))}
      {hidden > 0 && (
        <Pressable onPress={() => setOpen(true)} style={[styles.chip, small && styles.chipSmall]}>
          <Text style={[styles.chipText, small && styles.chipTextSmall, styles.moreText]}>
            +{hidden} mere
          </Text>
        </Pressable>
      )}
      {open && chips.length > limit && (
        <Pressable onPress={() => setOpen(false)} style={[styles.chip, small && styles.chipSmall]}>
          <Text style={[styles.chipText, small && styles.chipTextSmall, styles.moreText]}>
            Vis færre
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function CardA({ group, isRecommended, ctx }) {
  const [open, setOpen] = useState(false);
  const { best, others, chain } = group;
  const facilities = facilitiesFor(best.center, ctx.wishes, ctx);
  return (
    <View style={[GlobalStyle.card, isRecommended && GlobalStyle.cardHighlighted]}>
      <View style={GlobalStyle.cardHeader}>
        <Pressable
          style={GlobalStyle.cardTitleArea}
          onPress={() => ctx.onShowDetails(best.center.id)}
        >
          {isRecommended && <Badge />}
          <Text style={GlobalStyle.cardTitle}>{chain.name}</Text>
          <Text style={GlobalStyle.mutedText}>
            {best.center.name} · {km(best.distanceKm)}
          </Text>
        </Pressable>
        <FavoriteButton center={best.center} chain={best.chain} />
      </View>

      <View style={GlobalStyle.cardPriceRow}>
        <Text style={GlobalStyle.cardPrice}>{kr(best.honestYearlyPrice)}</Text>
        <Text style={GlobalStyle.cardPriceUnit}>/md · ærlig årspris</Text>
        <InfoButton term="honestYearlyPrice" />
      </View>

      <View style={styles.spacer} />
      <ChipsWithMore facilities={facilities} limit={A_VISIBLE} />
      <NotStatedRow notStated={best.notStated} />

      <View style={GlobalStyle.cardActions}>
        <ButtonComponent
          title="Se detaljer"
          type="text"
          size="small"
          onPress={() => ctx.onShowDetails(best.center.id)}
        />
        <SignupButton match={best} />
      </View>

      {others.length > 0 && (
        <>
          <View style={styles.divider} />
          <Toggle
            open={open}
            onPress={() => setOpen(!open)}
            label={`${others.length} ${others.length === 1 ? 'andet' : 'andre'} ${centersWord(others.length)} i ${chain.name}`}
          />
          {open &&
            others.map((match) => (
              <Pressable
                key={match.center.id}
                style={styles.rowA}
                onPress={() => ctx.onShowDetails(match.center.id)}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {match.center.name}
                  </Text>
                  <Text style={styles.rowPrice}>{kr(match.honestYearlyPrice)}/md</Text>
                </View>
                <Text style={styles.rowMeta}>{km(match.distanceKm)}</Text>
                <ChipsWithMore
                  facilities={facilitiesFor(match.center, ctx.wishes, ctx)}
                  limit={A_ROW_VISIBLE}
                  small
                />
              </Pressable>
            ))}
        </>
      )}
    </View>
  );
}

function VariantA({ groups, ctx }) {
  return groups.map((group, i) => (
    <CardA key={group.chain.id} group={group} isRecommended={i === 0} ctx={ctx} />
  ));
}

// ---------- Variant B: "Passer til dig" + begrundelse, faciliteter bag udfoldning ----------

// Én lille bjælke pr. ønske: turkis = opfyldt, gul = ukendt, rød = mangler.
function FitBar({ facilities }) {
  const wanted = facilities.filter((f) => f.wanted);
  return (
    <View style={styles.fitBar}>
      {wanted.map((f) => (
        <View
          key={f.key}
          style={[
            styles.fitSegment,
            {
              backgroundColor:
                f.value === true ? colors.accent : f.value == null ? colors.warning : colors.error,
            },
          ]}
        />
      ))}
    </View>
  );
}

function FitSummary({ facilities }) {
  const summary = wishSummary(facilities);
  if (summary.total === 0) {
    return (
      <View style={styles.fitBox}>
        <Text style={styles.fitTitle}>Passer til dig</Text>
        <Text style={GlobalStyle.mutedText}>Du har ingen ønsker valgt. Sæt dem i Filtre.</Text>
      </View>
    );
  }
  const extra = [
    summary.unknown > 0 && `${summary.unknown} ikke oplyst`,
    summary.missing > 0 && `${summary.missing} mangler`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.fitBox}>
      <View style={styles.rowTop}>
        <Text style={styles.fitTitle}>Passer til dig</Text>
        <Text style={styles.fitCount}>
          {summary.met} af {summary.total} ønsker
        </Text>
      </View>
      <FitBar facilities={facilities} />
      {extra ? <Text style={styles.rowMeta}>{extra}</Text> : null}
    </View>
  );
}

function FacilityDetailsB({ facilities }) {
  const wanted = facilities.filter((f) => f.wanted);
  const alsoHas = facilities.filter((f) => !f.wanted && f.value === true);
  const unknown = facilities.filter((f) => !f.wanted && f.value == null);
  const icon = (f) =>
    f.value === true
      ? ['checkmark-circle', colors.accent]
      : f.value == null
        ? ['help-circle', colors.warning]
        : ['close-circle', colors.error];
  return (
    <View style={GlobalStyle.detailsBox}>
      {wanted.length > 0 && <Text style={styles.subHeading}>Dine ønsker</Text>}
      {wanted.map((f) => {
        const [name, color] = icon(f);
        return (
          <View key={f.key} style={styles.checkRow}>
            <Ionicons name={name} size={16} color={color} />
            <Text style={styles.checkText}>
              {f.label}
              {f.mock ? '*' : ''}
            </Text>
            <Text style={styles.checkState}>
              {f.value === true ? 'Ja' : f.value == null ? 'Ikke oplyst' : 'Nej'}
            </Text>
          </View>
        );
      })}
      {alsoHas.length > 0 && <Text style={styles.subHeading}>Også i Centret</Text>}
      <View style={styles.chipRow}>
        {alsoHas.map((f) => (
          <FacilityChip key={f.key} item={f} small />
        ))}
      </View>
      {unknown.length > 0 && (
        <Text style={GlobalStyle.notStatedText}>
          Ikke oplyst: {unknown.map((f) => f.label + (f.mock ? '*' : '')).join(', ')}
        </Text>
      )}
    </View>
  );
}

function CardB({ group, isRecommended, ctx }) {
  const [showFacilities, setShowFacilities] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const { best, others, chain, reason } = group;
  const facilities = facilitiesFor(best.center, ctx.wishes, ctx);
  return (
    <View style={[GlobalStyle.card, isRecommended && GlobalStyle.cardHighlighted]}>
      <View style={GlobalStyle.cardHeader}>
        <View style={GlobalStyle.cardTitleArea}>
          {isRecommended && <Badge />}
          <Text style={GlobalStyle.cardTitle}>{chain.name}</Text>
        </View>
        <FavoriteButton center={best.center} chain={best.chain} />
      </View>

      <Pressable style={styles.centerLine} onPress={() => ctx.onShowDetails(best.center.id)}>
        <Ionicons name="location-outline" size={15} color={colors.muted} />
        <Text style={styles.centerLineText}>
          {best.center.name} · {km(best.distanceKm)}
        </Text>
      </Pressable>
      <View style={styles.reasonLine}>
        <Ionicons name="sparkles-outline" size={15} color={colors.accentText} />
        <Text style={styles.reasonText}>{reason.text}</Text>
      </View>

      <View style={GlobalStyle.cardPriceRow}>
        <Text style={GlobalStyle.cardPrice}>{kr(best.honestYearlyPrice)}</Text>
        <Text style={GlobalStyle.cardPriceUnit}>/md · ærlig årspris</Text>
        <InfoButton term="honestYearlyPrice" />
      </View>

      <FitSummary facilities={facilities} />
      <NotStatedRow notStated={best.notStated} />

      <Toggle
        open={showFacilities}
        onPress={() => setShowFacilities(!showFacilities)}
        label={`${showFacilities ? 'Skjul' : 'Vis'} faciliteter (${facilities.filter((f) => f.value === true).length})`}
      />
      {showFacilities && <FacilityDetailsB facilities={facilities} />}

      <View style={GlobalStyle.cardActions}>
        <ButtonComponent
          title="Se detaljer"
          type="text"
          size="small"
          onPress={() => ctx.onShowDetails(best.center.id)}
        />
        <SignupButton match={best} />
      </View>

      {others.length > 0 && (
        <>
          <View style={styles.divider} />
          <Toggle
            open={showOthers}
            onPress={() => setShowOthers(!showOthers)}
            label={`Andre ${centersWord(2)} i ${chain.name} (${others.length})`}
          />
          {showOthers &&
            others.map((match) => {
              const f = facilitiesFor(match.center, ctx.wishes, ctx);
              const s = wishSummary(f);
              const diff = match.honestYearlyPrice - best.honestYearlyPrice;
              return (
                <Pressable
                  key={match.center.id}
                  style={styles.rowB}
                  onPress={() => ctx.onShowDetails(match.center.id)}
                >
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {match.center.name}
                    </Text>
                    <Text style={styles.rowPrice}>{kr(match.honestYearlyPrice)}/md</Text>
                  </View>
                  <Text style={styles.rowMeta}>
                    {km(match.distanceKm)} · {diff >= 0 ? '+' : '−'}
                    {kr(Math.abs(diff))}/md
                    {s.total > 0 ? ` · ${s.met} af ${s.total} ønsker` : ''}
                  </Text>
                  <View style={styles.chipRow}>
                    {f
                      .filter((item) => item.wanted)
                      .map((item) => (
                        <FacilityChip key={item.key} item={item} small />
                      ))}
                  </View>
                </Pressable>
              );
            })}
        </>
      )}
    </View>
  );
}

function VariantB({ groups, ctx }) {
  return groups.map((group, i) => (
    <CardB key={group.chain.id} group={group} isRecommended={i === 0} ctx={ctx} />
  ));
}

// ---------- Variant C: stor hero for Anbefalet + sammenligningstabel for alle Kæder ----------

// Gitter med alle faciliteter Centret har eller brugeren ønsker. Tester om 14 felter er for meget.
function FacilityGrid({ facilities }) {
  const items = facilities.filter((f) => f.wanted || f.value === true);
  return (
    <View style={styles.grid}>
      {items.map((f) => {
        const color =
          !f.wanted || f.value === true
            ? f.wanted
              ? colors.accent
              : colors.muted
            : f.value == null
              ? colors.warning
              : colors.error;
        return (
          <View
            key={f.key}
            style={[
              styles.tile,
              f.wanted && { borderColor: color, backgroundColor: colors.surfaceRaised },
              f.mock && styles.chipMock,
            ]}
          >
            <Ionicons name={f.icon} size={20} color={color} />
            <Text
              style={[styles.tileText, { color }, f.wanted && f.value === false && styles.strike]}
              numberOfLines={2}
            >
              {f.label}
              {f.mock ? '*' : ''}
            </Text>
            {f.wanted && (
              <Ionicons
                name={f.value === true ? 'checkmark' : f.value == null ? 'help' : 'close'}
                size={12}
                color={color}
                style={styles.tileMark}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// Vandret række af små Center-kort (Kædens andre Centre).
function OtherCentersStrip({ others, ctx }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
      {others.map((match) => {
        const f = facilitiesFor(match.center, ctx.wishes, ctx);
        const s = wishSummary(f);
        return (
          <Pressable
            key={match.center.id}
            style={styles.miniCard}
            onPress={() => ctx.onShowDetails(match.center.id)}
          >
            <Text style={styles.rowName} numberOfLines={2}>
              {match.center.name}
            </Text>
            <Text style={styles.rowMeta}>{km(match.distanceKm)}</Text>
            <Text style={styles.rowPrice}>{kr(match.honestYearlyPrice)}/md</Text>
            {s.total > 0 && (
              <Text style={styles.rowMeta}>
                {s.met} af {s.total} ønsker
              </Text>
            )}
            <View style={styles.chipRow}>
              {visibleChips(f)
                .slice(0, 3)
                .map((item) => (
                  <FacilityChip key={item.key} item={item} small />
                ))}
              {visibleChips(f).length > 3 && (
                <Text style={styles.moreSmall}>+{visibleChips(f).length - 3}</Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Hero({ group, ctx }) {
  const { best, others, chain, reason } = group;
  const facilities = facilitiesFor(best.center, ctx.wishes, ctx);
  return (
    <View style={[GlobalStyle.card, GlobalStyle.cardHighlighted, styles.hero]}>
      <View style={GlobalStyle.cardHeader}>
        <View style={GlobalStyle.cardTitleArea}>
          <Badge />
          <Text style={styles.heroTitle}>{chain.name}</Text>
        </View>
        <FavoriteButton center={best.center} chain={best.chain} />
      </View>
      <Pressable onPress={() => ctx.onShowDetails(best.center.id)}>
        <Text style={styles.centerLineText}>
          {best.center.name} · {km(best.distanceKm)}
        </Text>
      </Pressable>
      <Text style={styles.reasonText}>{reason.text}</Text>
      <View style={GlobalStyle.cardPriceRow}>
        <Text style={styles.heroPrice}>{kr(best.honestYearlyPrice)}</Text>
        <Text style={GlobalStyle.cardPriceUnit}>/md · ærlig årspris</Text>
        <InfoButton term="honestYearlyPrice" />
      </View>
      <FacilityGrid facilities={facilities} />
      <NotStatedRow notStated={best.notStated} />
      <View style={GlobalStyle.cardActions}>
        <ButtonComponent
          title="Se detaljer"
          type="text"
          size="small"
          onPress={() => ctx.onShowDetails(best.center.id)}
        />
        <SignupButton match={best} />
      </View>
      {others.length > 0 && (
        <>
          <Text style={styles.subHeading}>
            Andre {centersWord(others.length)} i {chain.name}
          </Text>
          <OtherCentersStrip others={others} ctx={ctx} />
        </>
      )}
    </View>
  );
}

const COL_CHAIN = 104;
const COL_PRICE = 74;
const COL_WISH = 62;

// Én række pr. Kæde, én kolonne pr. ønske. Vandret scroll, når der er mange ønsker.
function CompareTable({ groups, ctx, selectedId, onSelect }) {
  // Uden ønsker vises de tre rigtige faciliteter som kolonner.
  const columns = ctx.wishes.length > 0 ? ctx.wishes : ['sauna', 'groupClasses', 'open24h'];
  const cellIcon = (value) =>
    value === true
      ? ['checkmark', colors.accent]
      : value == null
        ? ['help', colors.warning]
        : ['close', colors.error];
  return (
    <View style={[GlobalStyle.card, styles.tableCard]}>
      <Text style={styles.subHeading}>Sammenlign Kæder (bedste Center i hver)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tr, styles.thRow]}>
            <Text style={[styles.th, { width: COL_CHAIN }]}>Kæde</Text>
            <Text style={[styles.th, { width: COL_PRICE }]}>Ærlig årspris</Text>
            {columns.map((key) => (
              <Text key={key} style={[styles.th, styles.thWish, { width: COL_WISH }]} numberOfLines={2}>
                {wishLabel(key)}
                {isMockKey(key) ? '*' : ''}
              </Text>
            ))}
            <Text style={[styles.th, { width: COL_WISH }]}>Andet</Text>
          </View>
          {groups.map((group, i) => {
            const facilities = facilitiesFor(group.best.center, ctx.wishes, ctx);
            const byKey = Object.fromEntries(facilities.map((f) => [f.key, f]));
            const extra = facilities.filter((f) => !f.wanted && f.value === true).length;
            const selected = group.chain.id === selectedId;
            return (
              <Pressable
                key={group.chain.id}
                // Række 1 er heroen ovenfor, så den foldes ikke ud her.
                onPress={() => i > 0 && onSelect(selected ? null : group.chain.id)}
                style={[styles.tr, selected && styles.trSelected]}
              >
                <View style={{ width: COL_CHAIN }}>
                  <Text style={styles.tdChain} numberOfLines={1}>
                    {group.chain.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {i === 0 ? 'ANBEFALET · ' : ''}
                    {km(group.best.distanceKm)}
                  </Text>
                </View>
                <Text style={[styles.rowPrice, { width: COL_PRICE }]}>
                  {kr(group.best.honestYearlyPrice)}
                </Text>
                {columns.map((key) => {
                  const [name, color] = cellIcon(byKey[key]?.value ?? null);
                  return (
                    <View key={key} style={[styles.td, { width: COL_WISH }]}>
                      <Ionicons name={name} size={16} color={color} />
                    </View>
                  );
                })}
                <Text style={[styles.rowMeta, styles.td, { width: COL_WISH }]}>+{extra}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Text style={styles.rowMeta}>Tryk på en Kæde for at se dens Centre.</Text>
    </View>
  );
}

// Udfoldet Kæde under tabellen: bedste Center med Tilmeld + de andre Centre som små kort.
function SelectedChainPanel({ group, ctx }) {
  const { best, others, chain, reason } = group;
  return (
    <View style={GlobalStyle.card}>
      <View style={GlobalStyle.cardHeader}>
        <Pressable
          style={GlobalStyle.cardTitleArea}
          onPress={() => ctx.onShowDetails(best.center.id)}
        >
          <Text style={GlobalStyle.cardTitle}>{chain.name}</Text>
          <Text style={GlobalStyle.mutedText}>
            {best.center.name} · {km(best.distanceKm)}
          </Text>
        </Pressable>
        <FavoriteButton center={best.center} chain={best.chain} />
      </View>
      <Text style={styles.reasonText}>{reason.text}</Text>
      <View style={GlobalStyle.cardPriceRow}>
        <Text style={GlobalStyle.cardPrice}>{kr(best.honestYearlyPrice)}</Text>
        <Text style={GlobalStyle.cardPriceUnit}>/md · ærlig årspris</Text>
      </View>
      <View style={styles.spacer} />
      <View style={styles.chipRow}>
        {visibleChips(facilitiesFor(best.center, ctx.wishes, ctx)).map((item) => (
          <FacilityChip key={item.key} item={item} small />
        ))}
      </View>
      <NotStatedRow notStated={best.notStated} />
      <View style={GlobalStyle.cardActions}>
        <ButtonComponent
          title="Se detaljer"
          type="text"
          size="small"
          onPress={() => ctx.onShowDetails(best.center.id)}
        />
        <SignupButton match={best} />
      </View>
      {others.length > 0 && (
        <>
          <Text style={styles.subHeading}>
            Andre {centersWord(others.length)} i {chain.name}
          </Text>
          <OtherCentersStrip others={others} ctx={ctx} />
        </>
      )}
    </View>
  );
}

function VariantC({ groups, ctx }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = groups.find((g) => g.chain.id === selectedId);
  return (
    <>
      <Hero group={groups[0]} ctx={ctx} />
      {groups.length > 1 && (
        <CompareTable groups={groups} ctx={ctx} selectedId={selectedId} onSelect={setSelectedId} />
      )}
      {selected && <SelectedChainPanel group={selected} ctx={ctx} />}
    </>
  );
}

// ---------- Indgang fra FindScreen ----------

const MOCK_OPTIONS = [
  { value: 'off', label: 'Kun rigtige' },
  { value: 'few', label: 'Mock: få ønsker' },
  { value: 'many', label: 'Mock: mange' },
];

// matches = Centre fra matchCenters (allerede filtreret). Viser prototype-tilstanden øverst.
export default function ChainResultsPrototype({ variant, matches, filters, onShowDetails }) {
  const [mockLevel, setMockLevel] = useState('few');
  const groups = groupByChain(matches);
  const ctx = {
    wishes: wishesFor(filters, mockLevel),
    withMock: mockLevel !== 'off',
    onShowDetails,
  };
  const Variant = { A: VariantA, B: VariantB, C: VariantC }[variant] ?? VariantA;

  return (
    <View>
      <View style={styles.protoPanel}>
        <Text style={styles.protoTitle}>PROTOTYPE · variant {variant}</Text>
        <Text style={styles.protoText}>
          {groups.length} Kæder · {matches.length} {centersWord(matches.length)} · bedste Center =
          lavest Ærlig årspris, tættest inden for {CLOSE_PRICE_KR} kr/md. Sortering ignoreres.
        </Text>
        <Text style={styles.protoText}>
          Dine ønsker: {ctx.wishes.length > 0 ? ctx.wishes.map(wishLabel).join(', ') : 'ingen'}
        </Text>
        {ctx.withMock && (
          <Text style={styles.protoMock}>
            * = fiktiv facilitet/ønske (mock), fordelt tilfældigt på Centrene. Mock-ønsker
            filtrerer ikke.
          </Text>
        )}
        <SegmentedControl options={MOCK_OPTIONS} value={mockLevel} onChange={setMockLevel} />
      </View>
      <Variant groups={groups} ctx={ctx} />
      {/* Plads til prototype-bjælken nederst. */}
      <View style={styles.switcherSpace} />
    </View>
  );
}

const styles = StyleSheet.create({
  spacer: { height: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 12, marginBottom: 4 },
  switcherSpace: { height: 80 },

  protoPanel: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FFF200',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  protoTitle: { fontFamily: fonts.bold, color: '#FFF200', fontSize: 12, letterSpacing: 0.6 },
  protoText: { fontFamily: fonts.body, color: colors.muted, fontSize: 12 },
  protoMock: { fontFamily: fonts.body, color: '#FFF200', fontSize: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipSmall: { paddingHorizontal: 7, paddingVertical: 2 },
  chip_met: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  chip_unknown: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  chip_missing: { borderColor: colors.error },
  chip_plain: { backgroundColor: colors.surfaceRaised, opacity: 0.75 },
  chip_unknownPlain: { opacity: 0.6 },
  chipMock: { borderStyle: 'dashed' },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  chipTextSmall: { fontSize: 11 },
  strike: { textDecorationLine: 'line-through' },
  moreText: { color: colors.primary },
  moreSmall: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary, alignSelf: 'center' },

  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  toggleText: { fontFamily: fonts.semibold, color: colors.primary },

  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  rowName: { flexShrink: 1, fontFamily: fonts.semibold, color: colors.text },
  rowPrice: { fontFamily: fonts.semibold, color: colors.text, fontVariant: ['tabular-nums'] },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 4 },
  rowA: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  rowB: {
    padding: 10,
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: colors.inputBackground,
  },

  centerLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  centerLineText: { fontFamily: fonts.medium, color: colors.text },
  reasonLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  reasonText: { flexShrink: 1, fontFamily: fonts.medium, color: colors.accentText, marginTop: 2 },

  fitBox: {
    marginTop: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    gap: 6,
  },
  fitTitle: { fontFamily: fonts.semibold, color: colors.text },
  fitCount: { fontFamily: fonts.bold, color: colors.accentText },
  fitBar: { flexDirection: 'row', gap: 3 },
  fitSegment: { flex: 1, height: 6, borderRadius: 3 },
  subHeading: { fontFamily: fonts.bold, color: colors.text, marginTop: 10, marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  checkText: { flex: 1, fontFamily: fonts.body, color: colors.text },
  checkState: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },

  hero: { padding: 18 },
  heroTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  heroPrice: {
    fontFamily: fonts.bold,
    fontSize: 36,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 6 },
  tile: {
    width: '30%',
    flexGrow: 1,
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tileText: { fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' },
  tileMark: { position: 'absolute', top: 4, right: 6 },
  strip: { marginHorizontal: -4 },
  miniCard: {
    width: 180,
    marginHorizontal: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.inputBackground,
    gap: 2,
  },

  tableCard: { paddingHorizontal: 10 },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  thRow: { borderTopWidth: 0, alignItems: 'flex-end' },
  trSelected: { backgroundColor: colors.primaryLight },
  th: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  thWish: { textAlign: 'center' },
  td: { alignItems: 'center', textAlign: 'center' },
  tdChain: { fontFamily: fonts.semibold, color: colors.text },
});
