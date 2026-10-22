// Fælles læsning af kronebeløb fra kædernes sider (SATS, PureGym og Fitness X).
//
// Kæderne skriver beløb på flere måder: "1.050", "1050", "1050,00", "99,95", "4.193,00 kr."
// og "649 kr./md.". Et punkt er kun tusindtalsseparator, når det står foran præcis tre cifre;
// ellers ville "1050" blive læst som "105" efterfulgt af "0". Andet end et tal giver null.
export function parseAmount(text) {
  if (text == null) return null;
  const match = String(text).match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?(?!\d)|\d+(?:,\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}
