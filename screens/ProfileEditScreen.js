// Ansvarlig: Jakob
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import { useProfileSections } from '../components/useProfileSections';

// Redigér profil: én sektion fra Profil (route.params.section, fx 'address'), med sit navn som
// titel. Ændringer gemmes med det samme; "Færdig" går tilbage til Profil.
export default function ProfileEditScreen({ navigation, route }) {
  const { sections } = useProfileSections(navigation);
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
          <Text style={[GlobalStyle.mutedText, GlobalStyle.paragraph]}>
            Ændringer gemmes med det samme.
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
