// Ansvarlig: Jakob
import { useContext, useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import { useProfileSections } from '../components/useProfileSections';
import { UserContext } from '../data/UserContext';

// Redigér profil: én sektion fra Profil (route.params.section, fx 'address'), med sit navn som
// titel. Ændringer gemmes med det samme; "Færdig" går tilbage til Profil.
// For en bruger, der er logget ind, siger en diskret linje, om ændringen er gemt på kontoen
// ("Gemt") eller kun på telefonen, fordi gemningen i databasen fejlede.
const SAVE_STATUS_TEXT = {
  saving: 'Gemmer …',
  saved: 'Gemt',
  localOnly: 'Kun gemt på telefonen. Vi prøver igen, næste gang du ændrer noget.',
  failed: 'Kunne ikke gemmes. Prøv igen om lidt.',
};

function saveStatusText(status, loggedIn) {
  if (loggedIn && SAVE_STATUS_TEXT[status]) return SAVE_STATUS_TEXT[status];
  if (status === 'failed') return SAVE_STATUS_TEXT.failed;
  return 'Ændringer gemmes med det samme.';
}
export default function ProfileEditScreen({ navigation, route }) {
  const { sections } = useProfileSections(navigation);
  const { account, profileSaveStatus } = useContext(UserContext);
  const loggedIn = Boolean(account && !account.isAnonymous);
  const section = sections.find((entry) => entry.key === route?.params?.section);

  useEffect(() => {
    if (section) navigation.setOptions({ title: section.title });
  }, [navigation, section?.title]);

  if (!section) return null;

  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[GlobalStyle.stepContent, GlobalStyle.scrollEnd]}
        keyboardShouldPersistTaps="handled"
      >
        {section.key === 'account' ? (
          <View style={GlobalStyle.group}>{section.render()}</View>
        ) : (
          section.render()
        )}
        {section.key !== 'account' && (
          <Text
            style={[GlobalStyle.mutedText, GlobalStyle.paragraph]}
            accessibilityLiveRegion="polite"
          >
            {saveStatusText(profileSaveStatus, loggedIn)}
          </Text>
        )}
      </ScrollView>
      <View style={GlobalStyle.stickyFooter}>
        <View style={GlobalStyle.fill}>
          <ButtonComponent title="Færdig" type="primary" full onPress={() => navigation.goBack()} />
        </View>
      </View>
    </SafeAreaView>
  );
}
