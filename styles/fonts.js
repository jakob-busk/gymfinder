// Appens skrifter, som App.js henter ved opstart: Nunito til al tekst og alle priser (runde ender,
// men tydelige tal i lige kolonner) og Fredoka til titler og logoet (rund og varm). Kun de vægte,
// stilen bruger: Nunito 400/600 til tekst og 700 til pristal, Fredoka 500/600 til titler.
// Navnene bruges som fontFamily i GlobalStyle.js.
import { Fredoka_500Medium } from '@expo-google-fonts/fredoka/500Medium';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';

export const APP_FONTS = {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
};
