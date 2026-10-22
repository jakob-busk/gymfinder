// Ansvarlig: Jakob
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ScreenHeader from '../components/ScreenHeader';
import SettingsRow from '../components/SettingsRow';
import { useProfileSections } from '../components/useProfileSections';

// En gruppe rækker, én pr. sektion, med det valgte under navnet.
function SectionRows({ sections, onPress }) {
  return (
    <View style={GlobalStyle.group}>
      {sections.map((section, index) => (
        <View key={section.key}>
          {index > 0 && <View style={GlobalStyle.groupDivider} />}
          <SettingsRow
            icon={section.icon}
            label={section.title}
            value={section.summary}
            onPress={() => onPress(section)}
          />
        </View>
      ))}
    </View>
  );
}

// Profil: en liste som i telefonens Indstillinger med adresse, fødselsdato, Rabatprofil,
// Nuværende medlemskab, Præferencer og Konto. Hver række viser det valgte og åbner Redigér profil
// med kun den ene ting at rette. Ændringer slår straks igennem i Matchning på Find og gemmes
// automatisk (Users/<uid>/profile i Firebase og lokalt). Om os nås herfra, og under udvikling kan
// man starte forfra med onboarding.
export default function ProfileScreen({ navigation }) {
  const { sections, handleStartOver, canStartOver } = useProfileSections(navigation);
  const details = sections.filter((section) => section.key !== 'account');
  const account = sections.filter((section) => section.key === 'account');
  const edit = (section) => navigation.navigate('Redigér profil', { section: section.key });

  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['top']}>
      <ScrollView style={GlobalStyle.container} contentContainerStyle={GlobalStyle.scrollEnd}>
        <ScreenHeader title="Profil" />
        <Text style={GlobalStyle.mutedText}>
          Det her bruger vi til at regne din Ærlige årspris og finde Centre til dig.
        </Text>

        <Text style={GlobalStyle.groupTitle}>Dine oplysninger</Text>
        <SectionRows sections={details} onPress={edit} />

        <Text style={GlobalStyle.groupTitle}>Konto</Text>
        <SectionRows sections={account} onPress={edit} />

        <Text style={GlobalStyle.groupTitle}>Mere</Text>
        <View style={GlobalStyle.group}>
          <SettingsRow
            icon="information-circle-outline"
            label="Om GymFinder og Ronnie"
            onPress={() => navigation.navigate('Om os')}
          />
        </View>

        {/* Kun under udvikling (Expo Go): så onboarding kan testes igen. */}
        {__DEV__ && canStartOver && (
          <>
            <Text style={GlobalStyle.groupTitle}>Kun under udvikling</Text>
            <View style={GlobalStyle.group}>
              <SettingsRow
                icon="refresh-outline"
                label="Start forfra med onboarding"
                onPress={handleStartOver}
                danger
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
