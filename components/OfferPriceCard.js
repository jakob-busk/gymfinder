import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import InfoButton from './InfoButton';
import { feeSummary, formatKr, partnerInfo, priceBreakdown } from '../data/centerDetail';

// Én række med fagord til venstre, værdi til højre og evt. ⓘ.
function FeeRow({ label, value, term, style }) {
  return (
    <View style={[GlobalStyle.feeRow, style]}>
      <View style={GlobalStyle.inlineRow}>
        <Text style={GlobalStyle.feeLabel}>{label}</Text>
        {Boolean(term) && <InfoButton term={term} />}
      </View>
      <Text style={GlobalStyle.feeValue}>{value}</Text>
    </View>
  );
}

// Ét Tilbud på Centerdetalje med brugerens Ærlig årspris og Kvartalspris, den billigste
// mulighed, gebyrer, Makkerpris og prisudregningen måned for måned.
// pricedOffer er et prissat Tilbud fra Matchning; isCheapest fremhæver Centrets billigste Tilbud,
// hvis udregning også er foldet ud fra start. onSignup (valgfri) viser en knap, der åbner
// tilmeldingen til netop dette Tilbud.
export default function OfferPriceCard({ pricedOffer, user, isCheapest, onSignup }) {
  const [expanded, setExpanded] = useState(isCheapest);
  const { offer, yearlyOption, quarterlyOption } = pricedOffer;
  const fees = feeSummary(pricedOffer);
  const partner = partnerInfo(user, pricedOffer);
  const breakdown = priceBreakdown(pricedOffer);

  return (
    <View style={[GlobalStyle.card, isCheapest && GlobalStyle.cardHighlighted]}>
      <View style={GlobalStyle.cardHeader}>
        <Text style={GlobalStyle.cardTitle}>{offer.name}</Text>
        {isCheapest && (
          <View style={GlobalStyle.badge}>
            <Text style={GlobalStyle.badgeText}>BILLIGST HER</Text>
          </View>
        )}
      </View>
      {Boolean(offer.subscriptionType) && (
        <Text style={GlobalStyle.distanceText}>{offer.subscriptionType}</Text>
      )}

      <View style={GlobalStyle.inlineRow}>
        <Text style={GlobalStyle.priceText}>
          {formatKr(Math.round(pricedOffer.honestYearlyPrice))}/md (ærlig årspris)
        </Text>
        <InfoButton term="honestYearlyPrice" />
      </View>
      <View style={GlobalStyle.inlineRow}>
        <Text style={GlobalStyle.distanceText}>
          Kvartalspris {formatKr(Math.round(pricedOffer.quarterlyPrice))}/md
        </Text>
        <InfoButton term="quarterlyPrice" />
      </View>

      <Text style={GlobalStyle.savingText}>Billigst for dig: {yearlyOption.label}</Text>
      {quarterlyOption.id !== yearlyOption.id && (
        <Text style={GlobalStyle.mutedText}>
          De første 3 måneder er {quarterlyOption.label} billigst (Kvartalspris).
        </Text>
      )}

      <View style={GlobalStyle.paragraph}>
        <FeeRow label="Oprettelsesgebyr" value={fees.signupFee} />
        <FeeRow label="Admingebyr" value={fees.adminFee} term="adminFee" />
        <FeeRow label="Binding" value={fees.binding} term="binding" />
        {partner && (
          <FeeRow
            label="Makkerpris pr. person"
            value={
              partner.available ? `${formatKr(partner.price)}/${breakdown.perPeriod}` : 'Ingen'
            }
            term="partnerPrice"
          />
        )}
        {partner?.campaign && (
          <FeeRow
            label="Makkerpris, kampagne"
            value={
              `${formatKr(partner.campaign.price)}/${breakdown.perPeriod} de første ` +
              `${partner.campaign.months} betalinger`
            }
          />
        )}
        {partner?.available && partner.signupFee !== (pricedOffer.offer.signupFee ?? 0) && (
          <FeeRow label="Oprettelsesgebyr med makker" value={formatKr(partner.signupFee)} />
        )}
      </View>
      {partner?.available && Boolean(partner.requirement) && (
        <Text style={GlobalStyle.mutedText}>Krav for Makkerpris: {partner.requirement}</Text>
      )}

      <Pressable onPress={() => setExpanded(!expanded)} style={GlobalStyle.paragraph}>
        <Text style={GlobalStyle.link}>Udregning måned for måned {expanded ? '↑' : '↓'}</Text>
      </Pressable>

      {expanded && (
        <View style={GlobalStyle.detailsBox}>
          <Text style={GlobalStyle.mutedText}>
            Med {yearlyOption.label}. Pris inkl. admingebyr.
          </Text>
          {breakdown.rows.map((row) => (
            <FeeRow
              key={row.key}
              label={`${row.label} · ${row.kindLabel}`}
              value={
                row.share < 1
                  ? `${Math.round(row.share * 100)} % af ${formatKr(row.total)} = ` +
                    formatKr(row.counted)
                  : formatKr(row.total)
              }
            />
          ))}
          <FeeRow label="Oprettelsesgebyr" value={formatKr(breakdown.signupFee)} />
          <FeeRow
            label="I alt første år"
            value={formatKr(breakdown.yearTotal)}
            style={GlobalStyle.totalRow}
          />
          <FeeRow
            label="Ærlig årspris (÷ 12)"
            value={`${formatKr(Math.round(breakdown.honestYearlyPrice))}/md`}
            term="honestYearlyPrice"
          />
          {breakdown.rows.some((row) => row.share < 1) && (
            <Text style={GlobalStyle.mutedText}>
              Kæden opkræver pr. 30 dage, så der falder lidt mere end 12 betalinger på et år.
            </Text>
          )}
        </View>
      )}

      {onSignup && <ButtonComponent title={`Tilmeld dig ${offer.name}`} onPress={onSignup} />}
    </View>
  );
}
