import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import InfoButton from './InfoButton';
import {
  feeSummary,
  formatKr,
  partnerInfo,
  priceBreakdown,
  receiptLines,
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

// Et Tilbud på Centerdetalje stillet op som en kvittering for brugerens første år: måned for
// måned (samlet, når prisen er den samme), Oprettelsesgebyr, i alt, ÷ 12 = Ærlig årspris.
// Under bonen: Kvartalspris, Binding, Admingebyr og Makkerpris for brugere i Rabatgruppen
// Træn med en makker. pricedOffer er et prissat Tilbud fra Matchning; isCheapest viser
// "Billigst her", når Centret har flere Tilbud.
export default function OfferReceipt({ pricedOffer, chain, user, isCheapest }) {
  const { offer, yearlyOption, quarterlyOption } = pricedOffer;
  const breakdown = priceBreakdown(pricedOffer);
  const fees = feeSummary(pricedOffer);
  const partner = partnerInfo(user, pricedOffer);

  return (
    <View style={GlobalStyle.receipt}>
      <Text style={GlobalStyle.receiptKicker}>Kvittering · et år hos {chain?.name ?? 'kæden'}</Text>
      <View style={GlobalStyle.cardHeader}>
        <Text style={[GlobalStyle.cardTitle, GlobalStyle.shrinkText]}>{offer.name}</Text>
        {isCheapest && (
          <View style={GlobalStyle.badge}>
            <Text style={GlobalStyle.badgeText}>BILLIGST HER</Text>
          </View>
        )}
      </View>
      <Text style={GlobalStyle.mutedText}>
        {[offer.subscriptionType, `med ${yearlyOption.label}`].filter(Boolean).join(' · ')}
      </Text>

      <View style={GlobalStyle.receiptDivider} />
      {receiptLines(breakdown.rows).map((line) => (
        <ReceiptRow
          key={line.key}
          label={line.label}
          sublabel={line.kindLabel}
          value={
            line.share < 1
              ? `${Math.round(line.share * 100)} % × ${formatKr(line.total)}`
              : `${line.count} × ${formatKr(line.total)}`
          }
        />
      ))}
      <ReceiptRow label="Oprettelsesgebyr" value={formatKr(breakdown.signupFee)} />
      <View style={GlobalStyle.receiptDivider} />
      <ReceiptRow label="I alt første år" value={formatKr(Math.round(breakdown.yearTotal))} />
      <Text style={GlobalStyle.mutedText}>÷ 12 måneder</Text>
      <View style={GlobalStyle.receiptTotalLine} />
      <View style={GlobalStyle.receiptRow}>
        <View style={GlobalStyle.inlineRow}>
          <Text style={GlobalStyle.receiptTotalLabel}>Ærlig årspris</Text>
          <InfoButton term="honestYearlyPrice" />
        </View>
        <Text style={GlobalStyle.receiptTotal}>
          {formatKr(Math.round(breakdown.honestYearlyPrice))}/md
        </Text>
      </View>
      {breakdown.rows.some((row) => row.share < 1) && (
        <Text style={GlobalStyle.mutedText}>
          Kæden opkræver pr. 30 dage, så der falder lidt mere end 12 betalinger på et år.
        </Text>
      )}

      <View style={GlobalStyle.receiptDivider} />
      <ReceiptRow
        label="Kvartalspris"
        term="quarterlyPrice"
        sublabel={
          quarterlyOption.id !== yearlyOption.id
            ? `De første 3 måneder er ${quarterlyOption.label} billigst`
            : null
        }
        value={`${formatKr(Math.round(pricedOffer.quarterlyPrice))}/md`}
      />
      <ReceiptRow label="Binding" term="binding" value={fees.binding} />
      <ReceiptRow
        label="Admingebyr"
        term="adminFee"
        sublabel="Med i månedsprisen"
        value={fees.adminFee}
      />
      {partner && (
        <ReceiptRow
          label="Makkerpris pr. person"
          term="partnerPrice"
          value={partner.available ? `${formatKr(partner.price)}/${breakdown.perPeriod}` : 'Ingen'}
        />
      )}
      {partner?.campaign && (
        <ReceiptRow
          label="Makkerpris, kampagne"
          value={`${formatKr(partner.campaign.price)}/${breakdown.perPeriod} i ${partner.campaign.months} betalinger`}
        />
      )}
      {partner?.available && partner.signupFee !== (offer.signupFee ?? 0) && (
        <ReceiptRow label="Oprettelsesgebyr med makker" value={formatKr(partner.signupFee)} />
      )}
      {partner?.available && Boolean(partner.requirement) && (
        <Text style={GlobalStyle.mutedText}>Krav for Makkerpris: {partner.requirement}</Text>
      )}
    </View>
  );
}
