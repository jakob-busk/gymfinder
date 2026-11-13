// PROTOTYPE — slettes, når en variant er valgt (se /bcj-prototype).
// Plan: tre varianter af Centerdetalje (beskrivelse af Centret øverst, prisberegning under, med en
// mellemregning, der kan foldes ud) på den eksisterende skærm, skiftet med PrototypeSwitcher.
// Alle priser kommer fra Matchning via CenterDetailScreen; her regnes intet nyt.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors, fonts } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import FavoriteButton from './FavoriteButton';
import InfoButton from './InfoButton';
import {
  feeSummary,
  formatKr,
  partnerInfo,
  priceBreakdown,
  receiptLines,
} from '../data/centerDetail';

export const CENTER_DETAIL_VARIANTS = [
  { key: 'A', name: 'Lang side med priskort' },
  { key: 'B', name: 'Harmonika + bund-bjælke' },
  { key: 'C', name: 'Prisen først + faktaark' },
];

// ---------- Små fælles stykker (ikke layout) ----------

const kr = (amount) => formatKr(Math.round(amount));

// "med Kampagnepris" / "til Standardpris" – den mulighed, Ærlig årspris er regnet med.
function optionText(priced) {
  const { label, kind } = priced.yearlyOption;
  return kind === 'standard' ? 'til Standardpris' : `med ${label}`;
}

// Centrets Abonnementstyper (fx Lokal center, Landsdækkende), uden dubletter.
function subscriptionTypes(offers) {
  return [...new Set(offers.map((priced) => priced.offer.subscriptionType).filter(Boolean))];
}

// Binding for Centrets Tilbud: én tekst, hvis den er ens for alle, ellers pr. Tilbud.
function bindingText(offers) {
  const values = offers.map((priced) => feeSummary(priced).binding);
  if (new Set(values).size === 1) {
    return values[0] === 'Ingen' ? 'Ingen binding' : values[0];
  }
  return offers.map((priced, i) => `${priced.offer.name}: ${values[i]}`).join(' · ');
}

const FACILITY_ICONS = {
  Ja: 'checkmark-circle',
  Nej: 'close-circle',
  Ingen: 'close-circle',
  'Ikke oplyst': 'help-circle',
};

// Mellemregningen: måned for måned, Oprettelsesgebyr, i alt første år ÷ 12 = Ærlig årspris.
// Makkerpris-detaljer for brugere i Rabatgruppen Træn med en makker.
function Calculation({ priced, user }) {
  const breakdown = priceBreakdown(priced);
  const fees = feeSummary(priced);
  const partner = partnerInfo(user, priced);

  return (
    <View>
      {receiptLines(breakdown.rows).map((line) => (
        <View key={line.key} style={GlobalStyle.receiptRow}>
          <View style={GlobalStyle.shrinkText}>
            <Text style={GlobalStyle.receiptLabel}>{line.label}</Text>
            <Text style={GlobalStyle.mapLegend}>{line.kindLabel}</Text>
          </View>
          <Text style={GlobalStyle.receiptValue}>
            {line.share < 1
              ? `${Math.round(line.share * 100)} % × ${formatKr(line.total)}`
              : `${line.count} × ${formatKr(line.total)}`}
          </Text>
        </View>
      ))}
      <View style={GlobalStyle.receiptRow}>
        <Text style={GlobalStyle.receiptLabel}>Oprettelsesgebyr</Text>
        <Text style={GlobalStyle.receiptValue}>{formatKr(breakdown.signupFee)}</Text>
      </View>
      <View style={GlobalStyle.receiptDivider} />
      <View style={GlobalStyle.receiptRow}>
        <Text style={GlobalStyle.receiptLabel}>I alt første år</Text>
        <Text style={GlobalStyle.receiptValue}>{kr(breakdown.yearTotal)}</Text>
      </View>
      <View style={GlobalStyle.receiptRow}>
        <Text style={GlobalStyle.mutedText}>÷ 12 måneder = Ærlig årspris</Text>
        <Text style={GlobalStyle.receiptValue}>{kr(breakdown.honestYearlyPrice)}/md</Text>
      </View>
      {priced.adminFee > 0 && (
        <Text style={[GlobalStyle.mutedText, styles.note]}>
          Månedspriserne er inkl. Admingebyr på {fees.adminFee}.
        </Text>
      )}
      {breakdown.rows.some((row) => row.share < 1) && (
        <Text style={[GlobalStyle.mutedText, styles.note]}>
          Kæden opkræver pr. 30 dage, så der falder lidt mere end 12 betalinger på et år.
        </Text>
      )}
      {partner && (
        <Text style={[GlobalStyle.mutedText, styles.note]}>
          {partner.available
            ? `Makkerpris pr. person: ${formatKr(partner.price)}/${breakdown.perPeriod}` +
              (partner.campaign
                ? ` (kampagne: ${formatKr(partner.campaign.price)} i ${partner.campaign.months} betalinger)`
                : '') +
              (partner.requirement ? `. Krav: ${partner.requirement}` : '')
            : 'Tilbuddet har ingen Makkerpris.'}
        </Text>
      )}
    </View>
  );
}

// "Se udregningen ▾": en fold-ud-knap, lukket fra start.
function FoldToggle({ open, onPress, closedLabel, openLabel }) {
  return (
    <Pressable onPress={onPress} style={styles.foldToggle} accessibilityRole="button">
      <Text style={styles.foldToggleText}>{open ? openLabel : closedLabel}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
    </Pressable>
  );
}

function SignupButton({ selected, onSignup, small }) {
  return (
    <ButtonComponent
      title={small ? 'Tilmeld' : `Tilmeld dig ${selected.offer.name}`}
      type="primary"
      icon="open-outline"
      full={!small}
      onPress={onSignup}
    />
  );
}

// ---------- Variant A: lang side med hero, mærker og "Prisen for dig"-kort ----------

function VariantA(props) {
  const { center, chain, offers, bestOffer, selected, onSelect, facilities, distance, user } =
    props;
  const [open, setOpen] = useState(false);
  const types = subscriptionTypes(offers);

  return (
    <ScrollView style={GlobalStyle.screen} contentContainerStyle={styles.content}>
      {/* Beskrivelse af Centret */}
      <View style={styles.hero}>
        <View style={GlobalStyle.titleRow}>
          <Text style={styles.heroKicker}>{chain?.name ?? 'Kæde'}</Text>
          <FavoriteButton center={center} chain={chain} />
        </View>
        <Text style={[GlobalStyle.title, styles.heroTitle]}>{center.name}</Text>
        <Text style={GlobalStyle.mutedText}>{center.address}</Text>
        {distance && (
          <View style={styles.distancePill}>
            <Ionicons name="navigate-outline" size={14} color={colors.accentText} />
            <Text style={styles.distancePillText}>{distance}</Text>
          </View>
        )}
      </View>

      <View style={GlobalStyle.inlineRow}>
        <Text style={GlobalStyle.sectionLabel}>Faciliteter</Text>
        {facilities.some((row) => row.value === 'Ikke oplyst') && <InfoButton term="notStated" />}
      </View>
      <View style={GlobalStyle.chipRow}>
        {facilities.map((row) => {
          const isMachines = row.key === 'machines';
          const icon = FACILITY_ICONS[row.value] ?? 'barbell-outline';
          const yes = row.value === 'Ja' || (isMachines && FACILITY_ICONS[row.value] == null);
          return (
            <View key={row.key} style={[styles.tag, yes && styles.tagYes]}>
              <Ionicons name={icon} size={15} color={yes ? colors.accentText : colors.muted} />
              <Text style={[styles.tagText, yes && styles.tagTextYes]}>
                {isMachines || row.value !== 'Ja'
                  ? `${row.label}: ${row.value}`
                  : row.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={GlobalStyle.bodyText}>
        {offers.length} Tilbud her ({offers.map((priced) => priced.offer.name).join(', ')})
        {types.length > 0 ? ` · ${types.join(' og ')}` : ''} · {bindingText(offers)}.
      </Text>

      {/* Prisberegning */}
      <Text style={[GlobalStyle.sectionLabel, styles.sectionGap]}>Prisen for dig</Text>
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
                onPress={() => onSelect(priced.offer.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[GlobalStyle.offerTabText, active && GlobalStyle.offerTabTextActive]}>
                  {priced.offer.name}
                </Text>
                <Text style={GlobalStyle.offerTabPrice}>{kr(priced.honestYearlyPrice)}/md</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={[GlobalStyle.card, selected === bestOffer && GlobalStyle.cardHighlighted]}>
        <View style={GlobalStyle.cardHeader}>
          <Text style={[GlobalStyle.cardTitle, GlobalStyle.shrinkText]}>
            {selected.offer.name}
          </Text>
          {selected === bestOffer && offers.length > 1 && (
            <View style={GlobalStyle.badge}>
              <Text style={GlobalStyle.badgeText}>BILLIGST HER</Text>
            </View>
          )}
        </View>
        <Text style={GlobalStyle.mutedText}>
          {[selected.offer.subscriptionType, optionText(selected)].filter(Boolean).join(' · ')}
        </Text>
        <View style={GlobalStyle.cardPriceRow}>
          <Text style={styles.bigPrice}>{kr(selected.honestYearlyPrice)}</Text>
          <Text style={GlobalStyle.cardPriceUnit}>/md</Text>
        </View>
        <View style={GlobalStyle.inlineRow}>
          <Text style={GlobalStyle.mutedText}>Ærlig årspris</Text>
          <InfoButton term="honestYearlyPrice" />
        </View>
        <View style={[GlobalStyle.feeRow, styles.sectionGapSmall]}>
          <View style={GlobalStyle.inlineRow}>
            <Text style={GlobalStyle.feeLabel}>Kvartalspris</Text>
            <InfoButton term="quarterlyPrice" />
          </View>
          <Text style={GlobalStyle.feeValue}>{kr(selected.quarterlyPrice)}/md</Text>
        </View>

        <View style={GlobalStyle.cardSection}>
          <View style={styles.cardSectionInner}>
            <FoldToggle
              open={open}
              onPress={() => setOpen(!open)}
              closedLabel="Se udregningen"
              openLabel="Skjul udregningen"
            />
            {open && <Calculation priced={selected} user={user} />}
          </View>
        </View>
      </View>

      <ActionsAndNotices {...props} />
    </ScrollView>
  );
}

// Tilmeld, besparelse, Ronnie og advarsler i den rækkefølge, A og C bruger.
function ActionsAndNotices({ selected, bestOffer, chain, match, onSignup, onAskRonnie, notices }) {
  return (
    <>
      {match.savingPerMonth > 0 && selected === bestOffer && (
        <Text style={[GlobalStyle.savingText, GlobalStyle.spacedBelow]}>
          Du sparer {kr(match.savingPerMonth)}/md i forhold til dit nuværende medlemskab.
        </Text>
      )}
      <View style={GlobalStyle.choiceList}>
        <SignupButton selected={selected} onSignup={onSignup} />
        <Text style={[GlobalStyle.mapLegend, GlobalStyle.centeredText]}>
          Åbner {selected.offer.name} på {chain?.name ?? 'kædens'} egen side.
        </Text>
        <ButtonComponent
          title="Spørg Ronnie om dette center"
          type="text"
          ronnie
          onPress={onAskRonnie}
        />
      </View>
      <View style={styles.sectionGap}>{notices}</View>
    </>
  );
}

// ---------- Variant B: harmonika-paneler og klistret bund-bjælke ----------

function Panel({ title, summary, open, onToggle, children }) {
  return (
    <View style={styles.panel}>
      <Pressable onPress={onToggle} style={styles.panelHeader} accessibilityRole="button">
        <View style={GlobalStyle.shrinkText}>
          <Text style={styles.panelTitle}>{title}</Text>
          {!open && Boolean(summary) && (
            <Text style={GlobalStyle.mapLegend} numberOfLines={1}>
              {summary}
            </Text>
          )}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open && <View style={styles.panelBody}>{children}</View>}
    </View>
  );
}

function VariantB(props) {
  const {
    center,
    chain,
    offers,
    bestOffer,
    selected,
    onSelect,
    facilities,
    distance,
    user,
    match,
    notices,
    hasNotices,
    onSignup,
    onAskRonnie,
  } = props;
  const [panels, setPanels] = useState({
    about: true,
    offers: offers.length > 1,
    price: true,
    calculation: false,
    notices: hasNotices,
  });
  const toggle = (key) => setPanels({ ...panels, [key]: !panels[key] });
  const types = subscriptionTypes(offers);

  return (
    <View style={GlobalStyle.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={GlobalStyle.titleRow}>
          <Text style={[GlobalStyle.title, GlobalStyle.shrinkText, GlobalStyle.screenHeaderTitle]}>
            {center.name}
          </Text>
          <FavoriteButton center={center} chain={chain} />
        </View>
        <Text style={[GlobalStyle.mutedText, GlobalStyle.spacedBelow]}>
          {[chain?.name, distance].filter(Boolean).join(' · ')}
        </Text>

        <Panel
          title="Om centret"
          summary={center.address}
          open={panels.about}
          onToggle={() => toggle('about')}
        >
          <FactRow icon="location-outline" label="Adresse" value={center.address} />
          {distance && <FactRow icon="navigate-outline" label="Distance" value={distance} />}
          <FactRow
            icon="pricetags-outline"
            label="Abonnementstyper"
            value={types.join(', ') || 'Ikke oplyst'}
          />
          <FactRow icon="lock-closed-outline" label="Binding" value={bindingText(offers)} />
          <View style={[GlobalStyle.inlineRow, styles.sectionGapSmall]}>
            <Text style={styles.subheading}>Faciliteter</Text>
            {facilities.some((row) => row.value === 'Ikke oplyst') && (
              <InfoButton term="notStated" />
            )}
          </View>
          <View style={GlobalStyle.facilityGrid}>
            {facilities.map((row) => (
              <View key={row.key} style={GlobalStyle.facilityCell}>
                <Text style={GlobalStyle.mapLegend}>{row.label}</Text>
                <Text style={GlobalStyle.feeValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Panel>

        {offers.length > 1 && (
          <Panel
            title={`Tilbud (${offers.length})`}
            summary={`Valgt: ${selected.offer.name}`}
            open={panels.offers}
            onToggle={() => toggle('offers')}
          >
            <View style={GlobalStyle.segmented}>
              {offers.map((priced) => {
                const active = priced === selected;
                return (
                  <Pressable
                    key={priced.offer.id}
                    style={[GlobalStyle.segment, active && GlobalStyle.segmentActive]}
                    onPress={() => onSelect(priced.offer.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[GlobalStyle.segmentText, active && GlobalStyle.segmentTextActive]}
                    >
                      {priced.offer.name}
                    </Text>
                    <Text style={GlobalStyle.offerTabPrice}>{kr(priced.honestYearlyPrice)}/md</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[GlobalStyle.mapLegend, styles.sectionGapSmall]}>
              {selected === bestOffer
                ? 'Det billigste Tilbud for dig er valgt.'
                : `${bestOffer.offer.name} er billigst for dig (${kr(bestOffer.honestYearlyPrice)}/md).`}
            </Text>
          </Panel>
        )}

        <Panel
          title="Prisberegning"
          summary={`${kr(selected.honestYearlyPrice)}/md i Ærlig årspris`}
          open={panels.price}
          onToggle={() => toggle('price')}
        >
          <Text style={GlobalStyle.bodyText}>
            {selected.offer.name}
            {selected.offer.subscriptionType ? ` (${selected.offer.subscriptionType})` : ''}{' '}
            {optionText(selected)}.
          </Text>
          <View style={[GlobalStyle.feeRow, styles.sectionGapSmall]}>
            <View style={GlobalStyle.inlineRow}>
              <Text style={styles.subheading}>Ærlig årspris</Text>
              <InfoButton term="honestYearlyPrice" />
            </View>
            <Text style={GlobalStyle.receiptTotal}>{kr(selected.honestYearlyPrice)}/md</Text>
          </View>
          <View style={GlobalStyle.feeRow}>
            <View style={GlobalStyle.inlineRow}>
              <Text style={GlobalStyle.feeLabel}>Kvartalspris</Text>
              <InfoButton term="quarterlyPrice" />
            </View>
            <Text style={GlobalStyle.feeValue}>{kr(selected.quarterlyPrice)}/md</Text>
          </View>
          {match.savingPerMonth > 0 && selected === bestOffer && (
            <Text style={[GlobalStyle.savingText, styles.sectionGapSmall]}>
              Du sparer {kr(match.savingPerMonth)}/md i forhold til dit nuværende medlemskab.
            </Text>
          )}
        </Panel>

        <Panel
          title="Mellemregning"
          summary="Måned for måned, Oprettelsesgebyr og i alt ÷ 12"
          open={panels.calculation}
          onToggle={() => toggle('calculation')}
        >
          <Calculation priced={selected} user={user} />
        </Panel>

        {hasNotices && (
          <Panel
            title="Godt at vide"
            summary="30-års-advarsel og Spar mere-forslag"
            open={panels.notices}
            onToggle={() => toggle('notices')}
          >
            {notices}
          </Panel>
        )}

        <ButtonComponent
          title="Spørg Ronnie om dette center"
          type="text"
          ronnie
          onPress={onAskRonnie}
        />
      </ScrollView>

      {/* Klistret bund-bjælke: pris + Tilmeld. Ekstra luft nederst til prototype-vælgeren. */}
      <View style={[GlobalStyle.stickyFooter, styles.stickyFooterProto]}>
        <View style={GlobalStyle.fill}>
          <Text style={GlobalStyle.mapLegend}>
            {selected.offer.name} · Ærlig årspris
          </Text>
          <Text style={GlobalStyle.cardPrice}>{kr(selected.honestYearlyPrice)}/md</Text>
        </View>
        <SignupButton selected={selected} onSignup={onSignup} small />
      </View>
    </View>
  );
}

function FactRow({ icon, label, value }) {
  return (
    <View style={styles.factRow}>
      <Ionicons name={icon} size={16} color={colors.muted} style={styles.factIcon} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

// ---------- Variant C: prisen først, Tilbud som radioliste, faktaark under ----------

function VariantC(props) {
  const { center, chain, offers, bestOffer, selected, onSelect, facilities, distance, user } =
    props;
  const [open, setOpen] = useState(false);
  const types = subscriptionTypes(offers);

  const facts = [
    ['Kæde', chain?.name ?? 'Ikke oplyst'],
    ['Adresse', center.address],
    ['Distance', distance ?? 'Ikke oplyst'],
    ...facilities.map((row) => [row.label, row.value]),
    ['Abonnementstyper', types.join(', ') || 'Ikke oplyst'],
    ['Binding', bindingText(offers)],
  ];

  return (
    <ScrollView style={GlobalStyle.screen} contentContainerStyle={styles.content}>
      <View style={GlobalStyle.titleRow}>
        <View style={GlobalStyle.shrinkText}>
          <Text style={styles.compactTitle}>{center.name}</Text>
          <Text style={GlobalStyle.mutedText}>
            {[chain?.name, distance].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <FavoriteButton center={center} chain={chain} />
      </View>

      {/* Prisen først */}
      <View style={styles.summary}>
        <Text style={styles.summaryKicker}>Du betaler</Text>
        <View style={GlobalStyle.cardPriceRow}>
          <Text style={styles.hugePrice}>{kr(selected.honestYearlyPrice)}</Text>
          <Text style={GlobalStyle.cardPriceUnit}>/md</Text>
        </View>
        <Text style={[GlobalStyle.bodyText, styles.sectionGapSmall]}>
          for {selected.offer.name} {optionText(selected)}, regnet som Ærlig årspris over dit første
          år. De første 3 måneder er det {kr(selected.quarterlyPrice)}/md (Kvartalspris).
        </Text>
        <FoldToggle
          open={open}
          onPress={() => setOpen(!open)}
          closedLabel="Sådan regnede vi"
          openLabel="Skjul mellemregningen"
        />
        {open && <Calculation priced={selected} user={user} />}
      </View>

      {offers.length > 1 && (
        <>
          <Text style={GlobalStyle.sectionLabel}>Vælg Tilbud</Text>
          <View style={styles.radioList}>
            {offers.map((priced, i) => {
              const active = priced === selected;
              return (
                <Pressable
                  key={priced.offer.id}
                  style={[styles.radioRow, i > 0 && styles.radioRowBorder]}
                  onPress={() => onSelect(priced.offer.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? colors.primary : colors.muted}
                  />
                  <View style={GlobalStyle.fill}>
                    <View style={GlobalStyle.inlineRow}>
                      <Text style={styles.radioTitle}>{priced.offer.name}</Text>
                      {priced === bestOffer && (
                        <View style={GlobalStyle.badge}>
                          <Text style={GlobalStyle.badgeText}>BILLIGST</Text>
                        </View>
                      )}
                    </View>
                    <Text style={GlobalStyle.mapLegend}>
                      {[
                        priced.offer.subscriptionType,
                        optionText(priced),
                        feeSummary(priced).binding === 'Ingen'
                          ? 'ingen binding'
                          : `binding: ${feeSummary(priced).binding}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Text style={GlobalStyle.feeValue}>{kr(priced.honestYearlyPrice)}/md</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.sectionGap}>
        <ActionsAndNotices {...props} />
      </View>

      {/* Beskrivelse af Centret som faktaark */}
      <View style={GlobalStyle.inlineRow}>
        <Text style={GlobalStyle.sectionLabel}>Om centret</Text>
        {facilities.some((row) => row.value === 'Ikke oplyst') && <InfoButton term="notStated" />}
      </View>
      <View style={styles.factSheet}>
        {facts.map(([label, value], i) => (
          <View key={label} style={[styles.factSheetRow, i % 2 === 1 && styles.factSheetRowAlt]}>
            <Text style={styles.factSheetLabel}>{label}</Text>
            <Text
              style={[styles.factSheetValue, value === 'Ikke oplyst' && GlobalStyle.mutedText]}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ---------- Værten vælger variant ----------

export default function CenterDetailPrototype({ variant, ...props }) {
  if (variant === 'B') return <VariantB {...props} />;
  if (variant === 'C') return <VariantC {...props} />;
  return <VariantA {...props} />;
}

const styles = StyleSheet.create({
  // Ekstra luft nederst, så prototype-vælgeren ikke dækker indholdet.
  content: { padding: 16, paddingBottom: 110 },
  note: { fontSize: 12, marginTop: 4 },
  sectionGap: { marginTop: 20 },
  sectionGapSmall: { marginTop: 8 },
  foldToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  foldToggleText: { fontFamily: fonts.semibold, color: colors.primary },

  // A
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 8,
  },
  heroKicker: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.accentText,
  },
  heroTitle: { marginTop: 4, marginBottom: 6 },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  distancePillText: { fontFamily: fonts.semibold, color: colors.accentText, fontSize: 13 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagYes: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  tagText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  tagTextYes: { color: colors.text },
  bigPrice: {
    fontFamily: fonts.bold,
    fontSize: 40,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  cardSectionInner: { paddingHorizontal: 14, paddingBottom: 10 },

  // B
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  panelTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  panelBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  subheading: { fontFamily: fonts.semibold, color: colors.text },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  factIcon: { marginTop: 2 },
  factLabel: { fontFamily: fonts.body, color: colors.muted, width: 120 },
  factValue: { flex: 1, fontFamily: fonts.medium, color: colors.text },
  stickyFooterProto: { paddingBottom: 72 },

  // C
  compactTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  summary: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  summaryKicker: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  hugePrice: {
    fontFamily: fonts.bold,
    fontSize: 48,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  radioList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  radioRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  radioTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  factSheet: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  factSheetRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 9 },
  factSheetRowAlt: { backgroundColor: colors.surface },
  factSheetLabel: { width: 130, fontFamily: fonts.body, color: colors.muted },
  factSheetValue: { flex: 1, fontFamily: fonts.medium, color: colors.text },
});
