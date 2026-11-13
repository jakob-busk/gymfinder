// Ansvarlig: Jakob
import { useContext } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../../styles/GlobalStyle';
import BrandLogo from '../../components/BrandLogo';
import ButtonComponent from '../../components/ButtonComponent';
import Reveal from '../../components/Reveal';
import RonnieMascot from '../../components/RonnieMascot';
import { UserContext } from '../../data/UserContext';

// Det GymFinder kan, i tre korte punkter.
const POINTS = [
  'Én ærlig årspris med alle gebyrer, kampagner og dine Rabatter regnet med',
  'Centre tæt på dig, sorteret efter hvad du reelt betaler',
  'Besked, når et Center bliver billigere',
];

// Velkomst: logo, en stor overskrift som på en plakat, Ronnie på sin cirkel med en hilsen, hvad
// GymFinder kan, og "Kom i gang" før brugeren giver oplysninger. De øverste dele falder hurtigt på
// plads; knapperne står der fra start. Har brugeren allerede en konto (fx på en ny telefon), kan
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
                {/* "billigst" står omvendt på en blæk-markering; mellemrummene ligger inden i, så den får luft. */}
                Fitnesscentret, der reelt er
                <Text style={GlobalStyle.welcomeHighlight}>{' billigst '}</Text>
                for dig.
              </Text>
            </Reveal>
          </View>

          <Reveal index={2} style={GlobalStyle.welcomeRonnie}>
            {/* Ronnie hilser i en taleboble, hvis spids peger ned mod ham. */}
            <View style={GlobalStyle.welcomeBubble}>
              <View style={[GlobalStyle.bubbleTail, GlobalStyle.bubbleTailDown]} />
              <Text style={GlobalStyle.welcomeBubbleText}>Hej, jeg er Ronnie!</Text>
            </View>
            <RonnieMascot size="large" pose="vinker" />
          </Reveal>

          <View style={GlobalStyle.welcomePoints}>
            {POINTS.map((text, index) => (
              <Reveal key={text} index={3} distance={12}>
                <View style={GlobalStyle.welcomePoint}>
                  <Text style={GlobalStyle.welcomePointNumber}>0{index + 1}</Text>
                  <Text style={GlobalStyle.welcomePointText}>{text}</Text>
                </View>
              </Reveal>
            ))}
          </View>

          {/* Hovedknappen står der fra start, så man ikke venter på den. */}
          <View style={GlobalStyle.welcomeActions}>
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
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
