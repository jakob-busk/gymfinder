// Ansvarlig: Jakob
import { useContext } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../../styles/GlobalStyle';
import BrandLogo from '../../components/BrandLogo';
import ButtonComponent from '../../components/ButtonComponent';
import Marquee from '../../components/Marquee';
import Reveal from '../../components/Reveal';
import RonnieMascot from '../../components/RonnieMascot';
import { UserContext } from '../../data/UserContext';

// Det GymFinder kan, i tre korte punkter.
const POINTS = [
  'Én ærlig årspris med alle gebyrer, kampagner og dine Rabatter regnet med',
  'Centre tæt på dig, sorteret efter hvad du reelt betaler',
  'Besked, når et Center bliver billigere',
];

// Det, der regnes med i en Ærlig årspris, løber forbi på båndet.
const MARQUEE_WORDS = ['Ærlig årspris', 'Oprettelsesgebyr', 'Admingebyr', 'Kampagnepris', 'Rabat'];

// Velkomst: logo, en stor overskrift som på en plakat, Ronnie på sin cirkel med en hilsen, et bånd
// med det, der regnes med i prisen, hvad GymFinder kan, og "Kom i gang" før brugeren giver
// oplysninger. Delene falder på plads ét efter ét. Har brugeren allerede en konto (fx på en ny telefon), kan
// onboarding springes over med Log ind.
export default function WelcomeScreen({ navigation }) {
  const { accountsAvailable } = useContext(UserContext);

  return (
    <View style={GlobalStyle.welcomeRoot}>
      <SafeAreaView style={GlobalStyle.fill} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={GlobalStyle.welcome}
          showsVerticalScrollIndicator={false}
        >
          <View style={GlobalStyle.welcomeTop}>
            <Reveal>
              <BrandLogo size="large" />
            </Reveal>
            <Reveal index={1} distance={30}>
              <Text style={GlobalStyle.welcomeTagline}>
                {/* "billigst" står på en mint markering; mellemrummene ligger inden i, så den får luft. */}
                Fitnesscentret, der reelt er
                <Text style={GlobalStyle.welcomeHighlight}>{' billigst '}</Text>
                for dig.
              </Text>
            </Reveal>
          </View>

          <Reveal index={3} style={GlobalStyle.welcomeRonnie}>
            {/* Ronnie hilser i en taleboble, hvis spids peger ned mod ham. */}
            <View style={GlobalStyle.welcomeBubble}>
              <View style={[GlobalStyle.bubbleTail, GlobalStyle.bubbleTailDown]} />
              <Text style={GlobalStyle.welcomeBubbleText}>Hej, jeg er Ronnie!</Text>
            </View>
            <RonnieMascot size="large" pose="vinker" />
          </Reveal>

          <Reveal index={4}>
            <Marquee words={MARQUEE_WORDS} />
          </Reveal>

          <View style={GlobalStyle.welcomePoints}>
            {POINTS.map((text, index) => (
              <Reveal key={text} index={5 + index} distance={12}>
                <View style={GlobalStyle.welcomePoint}>
                  <Text style={GlobalStyle.welcomePointNumber}>0{index + 1}</Text>
                  <Text style={GlobalStyle.welcomePointText}>{text}</Text>
                </View>
              </Reveal>
            ))}
          </View>

          <Reveal index={8} style={GlobalStyle.welcomeActions}>
            <ButtonComponent
              title="Kom i gang"
              type="primary"
              full
              onPress={() => navigation.navigate('Adresse')}
            />
            {accountsAvailable && (
              <ButtonComponent
                title="Jeg har allerede en konto"
                type="text"
                onPress={() => navigation.navigate('Log ind')}
              />
            )}
          </Reveal>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
