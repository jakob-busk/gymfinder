import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import InfoButton from './InfoButton';
import {
  billingNote,
  feeSummary,
  formatKr,
  formatPrice,
  partnerInfo,
  priceBreakdown,
  receiptLines,
  offerAccessLabel,
  capitalize,
} from '../data/centerDetail';

// Én række på kvitteringen: tekst til venstre, beløb til højre.
function ReceiptRow({ label, sublabel, value, term }) {
  return (
    <View style={GlobalStyle.receiptRow}>
      <View style={GlobalStyle.shrinkText}>
        <View style={GlobalStyle.inlineRow}>
          <Text style={GlobalStyle.receiptLabel}>{label}</Text>
          {Boolean(term) && <InfoButton term={term} />}
        </View>
        {Boolean(sublabel) && <Text style={GlobalStyle.mapLegend}>{sublabel}</Text>}
      </View>
      <Text style={GlobalStyle.receiptValue}>{value}</Text>
    </View>
  );
}

// Et Tilbud på Centerdetalje stillet op som en kvittering for brugerens første år ("Sådan regner
// vi prisen"): måned for måned (samlet, når prisen er den samme), Oprettelsesgebyr, i alt,
// ÷ 12 = Ærlig årspris. Kædens produktnavn står her (i undertitlen), ikke ved prisen øverst.
// Under bonen: Kvartalspris, Binding, Admingebyr og Makkerpris for brugere i Rabatgruppen
// Træn med en makker. pricedOffer er et prissat Tilbud fra Matchning; isCheapest viser
// "Billigst her", når Centret har flere Tilbud.
export default function OfferReceipt({ pricedOffer, chain, user, isCheapest }) {
  const { offer, yearlyOption, quarterlyOption } = pricedOffer;
  const breakdown = priceBreakdown(pricedOffer);
  const fees = feeSummary(pricedOffer);
  const partner = partnerInfo(user, pricedOffer);
  // Titlen er den adgang, Tilbuddet giver; Kæden og produktnavnet står under som ekstra info.
  const accessLabel = offerAccessLabel(offer, chain?.name);
  const chainName = chain?.name ?? 'kæden';
  const note = billingNote(breakdown, chain?.name);

  return (
    <View style={GlobalStyle.receipt}>
      <Text style={GlobalStyle.receiptKicker}>Sådan regner vi prisen</Text>
      <View style={GlobalStyle.cardHeader}>
        <Text style={[GlobalStyle.cardTitle, GlobalStyle.shrinkText]}>{accessLabel}</Text>
        {isCheapest && (
          <View style={GlobalStyle.badge}>
            <Text style={GlobalStyle.badgeText}>Billigst her</Text>
          </View>
        )}
      </View>
      <Text style={GlobalStyle.mutedText}>
        {capitalize(
          [
            `et år hos ${chainName}`,
            accessLabel === offer.name ? null : offer.name,
            `med ${yearlyOption.label}`,
          ]
            .filter(Boolean)
            .join(' · '),
        )}
      </Text>

      <View style={GlobalStyle.receiptDivider} />
      {receiptLines(breakdown.rows).map((line) => (
        <ReceiptRow
          key={line.key}
          label={line.label}
          sublabel={line.kindLabel}
          value={line.value}
        />
      ))}
      <ReceiptRow label="Oprettelse" value={formatKr(breakdown.signupFee)} />
      <View style={GlobalStyle.receiptDivider} />
      <ReceiptRow label="I alt første år" value={formatKr(Math.round(breakdown.yearTotal))} />
      <Text style={GlobalStyle.mutedText}>÷ 12 måneder</Text>
      <View style={GlobalStyle.receiptTotalLine} />
      <View style={GlobalStyle.receiptRow}>
        <View>
          <View style={GlobalStyle.inlineRow}>
            <Text style={GlobalStyle.receiptTotalLabel}>Ærlig årspris</Text>
            <InfoButton term="honestYearlyPrice" />
          </View>
          <Text style={GlobalStyle.mapLegend}>pr. md.</Text>
        </View>
        <Text style={GlobalStyle.receiptTotal}>{formatKr(Math.round(breakdown.honestYearlyPrice))}</Text>
      </View>
      {Boolean(note) && <Text style={GlobalStyle.mutedText}>{note}</Text>}

      <View style={GlobalStyle.receiptDivider} />
      <ReceiptRow
        label="De første 3 måneder"
        term="quarterlyPrice"
        sublabel={
          quarterlyOption.id !== yearlyOption.id
            ? `Regnet med ${quarterlyOption.label}, som er billigst i starten`
            : null
        }
        value={formatPrice(Math.round(pricedOffer.quarterlyPrice))}
      />
      <ReceiptRow label="Binding" term="binding" value={fees.binding} />
      <ReceiptRow
        label="Admingebyr"
        term="adminFee"
        sublabel={fees.adminFeeNote}
        value={fees.adminFee}
      />
      {partner && (
        <ReceiptRow
          label="Makkerpris pr. person"
          term="partnerPrice"
          value={
            partner.available
              ? formatPrice(partner.price, breakdown.perPeriod)
              : `Findes ikke hos ${chainName}`
          }
        />
      )}
      {partner?.campaign && (
        <ReceiptRow
          label="Makkerpris, kampagne"
          value={
            `${formatPrice(partner.campaign.price, breakdown.perPeriod)} ` +
            `i ${partner.campaign.months} betalinger`
          }
        />
      )}
      {partner?.available && partner.signupFee !== (offer.signupFee ?? 0) && (
        <ReceiptRow label="Oprettelse med makker" value={formatKr(partner.signupFee)} />
      )}
      {partner?.available && Boolean(partner.requirement) && (
        <Text style={GlobalStyle.mutedText}>Krav for makkerpris: {partner.requirement}</Text>
      )}
    </View>
  );
}
