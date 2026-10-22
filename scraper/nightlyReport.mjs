// Nat-jobbets rapport som Markdown, til loggen og GitHub Actions' job-oversigt. Bygges ud fra
// den report, runNightlyJob (nightlyJob.mjs) returnerer.

import { REMOVE_AFTER_MISSING_NIGHTS } from './nightlyJob.mjs';

const show = (value) => (value == null ? '?' : String(value));

// Ét tal eller "under 30 / 30+".
const showPrice = (price) =>
  price != null && typeof price === 'object'
    ? `${show(price.under30)} / ${show(price.over30)}`
    : show(price);

function offerRow({ center, offer, standardPrice, campaignPrice, campaignMonths, ...rest }) {
  const price = showPrice(standardPrice);
  const campaign =
    campaignPrice == null ? '–' : `${showPrice(campaignPrice)} kr i ${campaignMonths} md.`;
  const binding = rest.bindingMonths == null ? '?' : `${rest.bindingMonths} md.`;
  return `| ${center} | ${offer} | ${price} | ${campaign} | ${show(rest.signupFee)} | ${binding} |`;
}

const KIND_LABELS = { favorite: 'Favorit', currentMembership: 'Nuværende medlemskab' };

// Prisalarm-delen af rapporten som Markdown-linjer (også brugt af demo-scriptet).
export function priceAlertLines(priceAlerts) {
  const lines = [
    '## Prisalarmer (push)',
    '',
    `- Sendt: ${priceAlerts.sent.length}`,
    `- Fejlet: ${priceAlerts.failed.length}`,
    `- Ikke sendt: ${priceAlerts.notSent.length}`,
    `- Push-tokens slettet (DeviceNotRegistered): ${priceAlerts.tokensRemoved}`,
  ];
  const row = (alert) =>
    `${KIND_LABELS[alert.kind] ?? alert.kind} ${alert.centerId}: ` +
    `${Math.round(alert.honestYearlyPrice)} kr/md, spar ${Math.round(alert.savingPerMonth)} kr/md`;
  for (const alert of priceAlerts.sent) lines.push(`- Sendt: ${row(alert)}`);
  for (const alert of priceAlerts.failed) lines.push(`- Fejlet: ${row(alert)} (${alert.error})`);
  for (const alert of priceAlerts.notSent) {
    lines.push(`- Ikke sendt: ${row(alert)} (${alert.reason})`);
  }
  for (const error of priceAlerts.errors) lines.push(`- Fejl: ${error}`);
  lines.push('');
  return lines;
}

// Hele rapporten som Markdown.
export function formatReport({ date, dryRun, chains, priceAlerts }) {
  const lines = [`# Scraper-rapport ${date}${dryRun ? ' (tør kørsel, intet skrevet)' : ''}`, ''];

  for (const chain of chains) {
    const status = chain.status === 'written' ? 'OK' : `SPRUNGET OVER: ${chain.reason}`;
    lines.push(`## ${chain.chainId}: ${status}`, '');
    lines.push(
      `- Centre fundet: ${chain.centersFound}`,
      `- Gyldige Tilbud: ${chain.validOffers}`,
      `- Fejl: ${chain.failures.length}`,
      `- Nye Tilbud: ${chain.newOffers.length}`,
      `- Prisændringer: ${chain.priceChanges.length}`,
      `- Forsvundet (beholdt): ${chain.missing.length}`,
      `- Fjernet efter ${REMOVE_AFTER_MISSING_NIGHTS} nætter: ${chain.removed.length}`,
    );
    for (const failure of chain.failures) {
      const where = [failure.centerId, failure.offerId].filter(Boolean).join(' / ');
      lines.push(`- Fejl i ${where}: ${failure.problems.join('; ')}`);
    }
    for (const warning of chain.warnings) lines.push(`- Advarsel: ${warning}`);
    for (const change of chain.priceChanges) {
      lines.push(
        `- Prisændring ${change.centerId} / ${change.offerId}: ` +
          `${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}`,
      );
    }
    for (const entry of chain.missing) {
      const where = [entry.centerId, entry.offerId].filter(Boolean).join(' / ');
      lines.push(`- Forsvundet ${where} (nat ${entry.missingNights})`);
    }
    for (const entry of chain.removed) {
      lines.push(`- Fjernet ${[entry.centerId, entry.offerId].filter(Boolean).join(' / ')}`);
    }
    lines.push('');
    if (chain.offers.length > 0) {
      lines.push(
        '| Center | Tilbud | Standardpris (u30 / 30+) | Kampagne | Oprettelse | Binding |',
        '|---|---|---|---|---|---|',
      );
      for (const offer of chain.offers) lines.push(offerRow(offer));
      lines.push('');
    }
  }

  if (priceAlerts) lines.push(...priceAlertLines(priceAlerts));
  return lines.join('\n');
}
