import { Linking } from 'react-native';

import { signupLink } from '../data/centerDetail';

// "Gå til tilmelding": åbner tilmeldingen til Tilbuddet (pricedOffer fra Matchning) i Centret med
// GymFinders henvisningslink. Uden Tilbuddets eget link bruges Centrets eller Kædens side.
// Kaster en fejl med dansk tekst, hvis der ikke er noget link, eller det ikke kan åbnes.
export async function openSignupPage(center, chain, pricedOffer) {
  const url = signupLink(center, chain, pricedOffer);
  if (!url) throw new Error('Kæden har ikke oplyst en tilmeldingsside.');
  await Linking.openURL(url);
}
