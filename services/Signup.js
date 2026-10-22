import { Linking } from 'react-native';

import { signupLink } from '../data/centerDetail';

// "Gå til tilmelding": åbner Kædens tilmeldingsside for Centret med GymFinders henvisningslink.
// Kaster en fejl med dansk tekst, hvis der ikke er noget link, eller det ikke kan åbnes.
export async function openSignupPage(center, chain) {
  const url = signupLink(center, chain);
  if (!url) throw new Error('Kæden har ikke oplyst en tilmeldingsside.');
  await Linking.openURL(url);
}
