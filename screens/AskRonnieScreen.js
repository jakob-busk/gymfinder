// Ansvarlig: Bastian
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ButtonComponent from '../components/ButtonComponent';
import RonnieMascot from '../components/RonnieMascot';
import { RONNIE_SUGGESTIONS, ronnieErrorMessage, ronnieMatches } from '../data/ronnie';
import { remainingNotice, ronnieWeekOffMessage } from '../data/ronnieUsage';
import { UserContext } from '../data/UserContext';
import { useCenterData } from '../services/CenterData';
import { useFilterSettings } from '../services/FilterSettings';
import { geocodeAddress } from '../services/Location';
import { askRonnie, ronnieAvailable } from '../services/Ronnie';
import { loadRemainingRonnieQuestions, recordRonnieQuestion } from '../services/RonnieUsage';

// Spørg Ronnie: chat med Ronnie, der kun anbefaler Centre fra GymFinder og sammenligner på
// brugerens Ærlig årspris. Ronnie kender de 20 nærmeste Centre, der matcher brugerens Filtre
// (plus det Center, man spørger om fra Centerdetalje). Spørger man om et andet sted i landet, slår
// han stedet op og får de nærmeste Centre dér. Hele samtalen sendes med hver gang, så han husker
// den. Under hvert svar er der en "Se [center] →"-knap pr. Center, han nævner.
// Hver bruger kan stille RONNIE_WEEKLY_LIMIT spørgsmål om ugen (se data/ronnieUsage.js). Derefter
// holder Ronnie fri resten af ugen, og der sendes intet til OpenAI.
export default function AskRonnieScreen({ navigation, route }) {
  const { user, authUser } = useContext(UserContext);
  const uid = authUser?.uid ?? null;
  const centerData = useCenterData();
  const { filters, ...filterSettings } = useFilterSettings(user.preferences);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [askedCenterIds, setAskedCenterIds] = useState([]);
  // Spørgsmål tilbage i denne uge; null, indtil tælleren er hentet.
  const [remaining, setRemaining] = useState(null);
  const nextMessageId = useRef(1);
  const scrollRef = useRef(null);

  // "Spørg Ronnie om dette center" på Centerdetalje: færdigt spørgsmål i inputfeltet, og
  // Centret kommer med i det, Ronnie kender.
  const question = route?.params?.question;
  const askedCenterId = route?.params?.centerId;
  const askedAt = route?.params?.askedAt;
  useEffect(() => {
    if (question) setInput(question);
    if (askedCenterId) {
      setAskedCenterIds((current) =>
        current.includes(askedCenterId) ? current : [...current, askedCenterId],
      );
    }
  }, [question, askedCenterId, askedAt]);

  // Tælleren hentes, hver gang fanen får fokus, så en ny uge (eller en anden telefon) ses.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadRemainingRonnieQuestions(uid)
        .then((left) => {
          if (active) setRemaining(left);
        })
        .catch((loadError) => console.error('Hent Ronnie-tæller fejlede:', loadError));
      return () => {
        active = false;
      };
    }, [uid]),
  );

  const loading = centerData.loading || filterSettings.loading;
  const weekOff = remaining === 0;
  const notice = remaining == null ? null : remainingNotice(remaining);
  const matches = useMemo(
    () =>
      loading
        ? []
        : ronnieMatches({
            centers: centerData.centers,
            chains: centerData.chains,
            user,
            filters,
            today: new Date(),
            includeCenterIds: askedCenterIds,
          }),
    [loading, centerData.centers, centerData.chains, user, filters, askedCenterIds],
  );

  const withId = (message) => ({ ...message, id: nextMessageId.current++ });

  const sendConversation = async (conversation) => {
    setError(null);
    setSending(true);
    try {
      const lookupInput = {
        geocode: geocodeAddress,
        centers: centerData.centers,
        chains: centerData.chains,
        user,
        filters,
        today: new Date(),
      };
      const reply = await askRonnie({ conversation, matches, user, lookupInput });
      setMessages([...conversation, withId(reply)]);
      // Tælles først, når Ronnie har svaret, så en fejl og "Prøv igen" kun koster ét spørgsmål.
      recordRonnieQuestion(uid)
        .then(setRemaining)
        .catch((recordError) => console.error('Gem Ronnie-tæller fejlede:', recordError));
    } catch (sendError) {
      console.error('Spørg Ronnie fejlede:', sendError);
      setError(ronnieErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  };

  // Grænsen tjekkes, før der sendes noget til OpenAI. false, når ugens spørgsmål er brugt.
  // Kan tælleren slet ikke læses, får brugeren lov at spørge (fejlen logges).
  const hasQuestionsLeft = async () => {
    setSending(true);
    let left;
    try {
      left = await loadRemainingRonnieQuestions(uid);
    } catch (limitError) {
      console.error('Tjek af Ronnies ugentlige grænse fejlede:', limitError);
      return true;
    }
    setRemaining(left);
    if (left > 0) return true;
    setError(null);
    setSending(false);
    return false;
  };

  const handleSend = async (text) => {
    const content = text.trim();
    if (!content || sending || loading || weekOff) return;
    if (!(await hasQuestionsLeft())) return;
    const conversation = [...messages, withId({ role: 'user', content })];
    setMessages(conversation);
    setInput('');
    await sendConversation(conversation);
  };

  // Prøv igen sender samme samtale igen; brugerens sidste besked står der allerede.
  const handleRetry = async () => {
    if (sending || !(await hasQuestionsLeft())) return;
    await sendConversation(messages);
  };

  const centerName = (centerId) =>
    centerData.centers.find((center) => center.id === centerId)?.name ?? 'Centret';

  if (!ronnieAvailable) {
    return (
      <SafeAreaView style={GlobalStyle.screen} edges={['top']}>
        <ScrollView contentContainerStyle={GlobalStyle.chatContent}>
          <Text style={GlobalStyle.title}>Spørg Ronnie</Text>
          <RonnieMascot />
          <View style={GlobalStyle.infoBox}>
            <Text style={GlobalStyle.infoTitle}>Ronnie holder fri lige nu</Text>
            <Text>{ronnieErrorMessage({ code: 'missingKey' })}</Text>
          </View>
          <Text style={GlobalStyle.mutedText}>
            Indtil da kan du finde det Center med den laveste Ærlig årspris på Find.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const renderMessage = ({ item: message }) => {
    if (message.role === 'user') {
      return (
        <View style={[GlobalStyle.bubble, GlobalStyle.bubbleUser]}>
          <Text style={GlobalStyle.bubbleUserText}>{message.content}</Text>
        </View>
      );
    }

    return (
      <View>
        <View style={GlobalStyle.bubbleRow}>
          <RonnieMascot size="avatar" />
          <View style={[GlobalStyle.bubble, GlobalStyle.bubbleRonnie]}>
            <Text style={GlobalStyle.bubbleText}>{message.content}</Text>
          </View>
        </View>
        {message.centerIds.length > 0 && (
          <View style={GlobalStyle.chatButtons}>
            {message.centerIds.map((centerId) => (
              <ButtonComponent
                key={centerId}
                title={`Se ${centerName(centerId)} →`}
                onPress={() => navigation.navigate('CenterDetaljer', { centerId })}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={GlobalStyle.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={GlobalStyle.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={scrollRef}
          data={messages}
          keyExtractor={(message) => String(message.id)}
          renderItem={renderMessage}
          contentContainerStyle={GlobalStyle.chatContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <>
              <Text style={GlobalStyle.title}>Spørg Ronnie</Text>

              {messages.length === 0 && (
                <>
                  <RonnieMascot size="small" />
                  <Text style={GlobalStyle.centeredText}>
                    Hej, jeg er Ronnie! Skriv, hvad du leder efter, fx &quot;billigt med sauna uden
                    binding&quot;. Jeg sammenligner Centrene tæt på dig på din Ærlige årspris, og
                    jeg kan også slå Centre op andre steder i landet, fx ved dit sommerhus.
                  </Text>
                  <View style={GlobalStyle.choiceList}>
                    {RONNIE_SUGGESTIONS.map((suggestion) => (
                      <ButtonComponent
                        key={suggestion}
                        title={suggestion}
                        onPress={() => handleSend(suggestion)}
                        disabled={sending || loading || weekOff}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          }
          ListFooterComponent={
            <>
              {sending && (
                <View style={GlobalStyle.bubbleRow}>
                  <RonnieMascot size="avatar" />
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}

              {weekOff && (
                <View style={[GlobalStyle.infoBox, GlobalStyle.paragraph]}>
                  <Text style={GlobalStyle.infoTitle}>Ronnie holder fri resten af ugen</Text>
                  <Text>{ronnieWeekOffMessage(new Date())}</Text>
                </View>
              )}

              {notice && (
                <Text style={[GlobalStyle.mutedText, GlobalStyle.paragraph]}>{notice}</Text>
              )}

              {error && !weekOff && (
                <View style={[GlobalStyle.warningBox, GlobalStyle.paragraph]}>
                  <Text style={GlobalStyle.warningTitle}>Ronnie kunne ikke svare</Text>
                  <Text>{error}</Text>
                  <View style={GlobalStyle.paragraph}>
                    <ButtonComponent title="Prøv igen" onPress={handleRetry} disabled={sending} />
                  </View>
                </View>
              )}
            </>
          }
        />

        <View style={GlobalStyle.chatInputRow}>
          <TextInput
            style={GlobalStyle.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder="Fx: Billigt med sauna tæt på mig"
            placeholderTextColor={colors.muted}
            multiline
          />
          <ButtonComponent
            title="Send"
            type="primary"
            onPress={() => handleSend(input)}
            disabled={sending || loading || weekOff || !input.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
