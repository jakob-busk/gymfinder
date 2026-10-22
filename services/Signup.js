import { Alert, Linking } from 'react-native';

import { signupLink } from '../data/centerDetail';
import { SIGNUP_ERROR_MESSAGE } from '../data/errors';

// "Gå til tilmelding": åbner tilmeldingen til Tilbuddet (pricedOffer fra Matchning) i Centret med
// GymFinders henvisningslink. Uden Tilbuddets eget link bruges Centrets eller Kædens side.
// Er der ikke noget link, eller kan det ikke åbnes, logges fejlen, og brugeren får en Alert.
export async function openSignupPage(center, chain, pricedOffer) {
  try {
    const url = signupLink(center, chain, pricedOffer);
    if (!url) throw new Error('Kæden har ikke oplyst en tilmeldingsside.');
    await Linking.openURL(url);
  } catch (error) {
    console.error('Åbn tilmelding fejlede:', error);
    Alert.alert('Kunne ikke åbne tilmeldingen', SIGNUP_ERROR_MESSAGE);
  }
}
