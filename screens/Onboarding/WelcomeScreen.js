// Ansvarlig: Jakob
import { useContext } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { brand, colors } from '../../styles/GlobalStyle';
import BrandLogo from '../../components/BrandLogo';
import ButtonComponent from '../../components/ButtonComponent';
import RonnieMascot from '../../components/RonnieMascot';
import { UserContext } from '../../data/UserContext';

// Det GymFinder kan, i tre korte punkter.
const POINTS = [
  ['pricetag', 'Én ærlig årspris med alle gebyrer, kampagner og dine Rabatter regnet med'],
  ['map', 'Centre tæt på dig, sorteret efter hvad du reelt betaler'],
  ['notifications', 'Besked, når et Center bliver billigere'],
];

// Velkomst: logo, Ronnie stort på nattehimlen, hvad GymFinder kan, og "Kom i gang" før brugeren
// giver oplysninger. Har brugeren allerede en konto (fx på en ny telefon), kan onboarding
// springes over med Log ind.
export default function WelcomeScreen({ navigation }) {
  const { accountsAvailable } = useContext(UserContext);

  return (
    <LinearGradient colors={brand.heroGradient} style={GlobalStyle.fill}>
      <SafeAreaView style={GlobalStyle.welcome} edges={['top', 'bottom']}>
        <View style={GlobalStyle.welcomeTop}>
          <BrandLogo size="large" />
          <Text style={GlobalStyle.welcomeTagline}>
            Fitnesscentret, der reelt er billigst for dig.
          </Text>
        </View>

        <RonnieMascot size="large" pose="vinker" />

        <View style={GlobalStyle.welcomePoints}>
          {POINTS.map(([icon, text]) => (
            <View key={icon} style={GlobalStyle.welcomePoint}>
              <Ionicons name={icon} size={18} color={colors.accentText} />
              <Text style={GlobalStyle.welcomePointText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={GlobalStyle.welcomeActions}>
          <ButtonComponent
            title="Kom i gang"
            type="primary"
            onPress={() => navigation.navigate('Adresse')}
          />
          {accountsAvailable && (
            <ButtonComponent
              title="Jeg har allerede en konto"
              type="text"
              onPress={() => navigation.navigate('Log ind')}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
