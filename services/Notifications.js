import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';

import {
  centerIdFromNotification,
  currentMembershipAlertTrigger,
  favoriteAlertTriggers,
  hasAnyPriceAlert,
  markCurrentMembershipAlertNotified,
  markFavoriteNotified,
  priceAlertMessage,
} from '../data/priceAlerts';
import { savePushToken } from './PriceAlerts';

// Notifikationer til Prisalarmer: tilladelse, Expo push-token, lokale beskeder og tryk på en
// besked. Alt, der rører expo-notifications, ligger her.
//
// Expo Go på Android understøtter ikke remote push (siden SDK 53), og push-API'erne kaster dér.
// Ældre udgaver af expo-notifications (til og med 57.0.22) crasher allerede ved import i Expo Go
// på Android. Derfor indlæses modulet slet ikke dér: alarmerne gemmes stadig, og en opfyldt
// alarm vises som en besked i appen, når den åbnes.
export const pushSupported = !(isRunningInExpoGo() && Platform.OS === 'android');

// require i stedet for import, så modulet kun indlæses, når det er sikkert.
const Notifications = pushSupported ? require('expo-notifications') : null;

const ANDROID_CHANNEL_ID = 'default';

// EAS-projektets id kræves for at få et Expo push-token. Det står i app-konfigurationen efter
// `eas init` (extra.eas.projectId) eller i .env som EXPO_PUBLIC_EAS_PROJECT_ID.
function easProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    null
  );
}

// Kaldes øverst i App.js: beskeder vises også, mens appen er åben.
export function initNotificationHandler() {
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// Android 13+ viser først tilladelses-prompten, når der findes en kanal.
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Prisalarmer',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Har brugeren givet tilladelse? ask = true viser systemets prompt, hvis der ikke er svaret endnu
// (kun første gang en alarm slås til). Returnerer true/false.
export async function hasNotificationPermission({ ask = false } = {}) {
  if (!Notifications) return false;
  await ensureAndroidChannel();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && ask) ({ status } = await Notifications.requestPermissionsAsync());
  return status === 'granted';
}

// Henter Expo push-tokenet ("ExponentPushToken[...]"). Spørger kun om tilladelse, når ask er sat.
// Returnerer { token } eller { token: null, reason }, hvor reason er:
//   'unsupported'  Expo Go på Android (ingen remote push)
//   'denied'       brugeren har ikke givet tilladelse
//   'no-project'   EAS projectId mangler i konfigurationen
//   'failed'       fx ingen forbindelse eller en simulator; prøves igen ved næste opstart
export async function getPushToken({ ask = false } = {}) {
  if (!Notifications) return { token: null, reason: 'unsupported' };
  if (!(await hasNotificationPermission({ ask }))) return { token: null, reason: 'denied' };

  const projectId = easProjectId();
  if (!projectId) {
    console.error('EAS projectId mangler: kør `eas init` eller sæt EXPO_PUBLIC_EAS_PROJECT_ID');
    return { token: null, reason: 'no-project' };
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data };
  } catch (error) {
    console.error('Hent push-token fejlede:', error);
    return { token: null, reason: 'failed' };
  }
}

// Viser opfyldte Prisalarmer ([{ title, body, data }] fra priceAlertMessage) som lokale
// notifikationer. Kan modulet ikke bruges (Expo Go på Android), eller er der ingen tilladelse,
// vises den første som en besked i appen med "Se Center" i stedet.
export async function showPriceAlerts(messages, onOpenCenter) {
  if (messages.length === 0) return;
  if (Notifications && (await hasNotificationPermission())) {
    for (const message of messages) {
      await Notifications.scheduleNotificationAsync({
        content: { title: message.title, body: message.body, data: message.data },
        trigger: null,
      });
    }
    return;
  }
  const [first] = messages;
  const others = messages.length - 1;
  const word = others === 1 ? 'Prisalarm' : 'Prisalarmer';
  const more = others > 0 ? ` (og ${others} ${word} mere)` : '';
  Alert.alert(first.title, `${first.body}${more}`, [
    { text: 'Luk', style: 'cancel' },
    { text: 'Se Center', onPress: () => onOpenCenter(first.data.centerId) },
  ]);
}

// Kalder onOpenCenter(centerId), når brugeren trykker på en Prisalarm, både mens appen kører og
// når appen blev startet af trykket. Returnerer en funktion, der stopper lytningen.
// Et håndteret tryk ryddes som "sidste svar", så det ikke åbner Centret igen, når App.js starter
// lytningen forfra (fx efter log ind/ud, hvor uid'et skifter).
export function listenForAlertTaps(onOpenCenter) {
  // På web (localhost) findes der ingen notifikationer at trykke på.
  if (!Notifications || Platform.OS === 'web') return () => {};

  const handleResponse = (response) => {
    const centerId = centerIdFromNotification(response?.notification?.request?.content?.data);
    if (centerId) onOpenCenter(centerId);
    Notifications.clearLastNotificationResponse();
  };

  const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
  handleResponse(Notifications.getLastNotificationResponse());

  return () => subscription.remove();
}

// Henter Expo push-tokenet og gemmer det på brugeren, så nat-jobbet kan sende push.
// ask = true spørger om tilladelse (kun når brugeren slår en alarm til). Returnerer
// 'registered' eller grunden til, at der ikke er push (se getPushToken ovenfor).
// Uden Firebase kan tokenet ikke gemmes ('no-account'), men lokale beskeder virker stadig.
export async function registerForPush(uid, { ask = false } = {}) {
  const { token, reason } = await getPushToken({ ask });
  if (!token) return reason;
  return (await savePushToken(uid, token, Platform.OS)) ? 'registered' : 'no-account';
}

// Sikkerhedsnet ved app-åbning: tjekker brugerens Prisalarmer mod de aktuelle priser, når appen
// åbnes eller kommer i forgrunden, og viser en lokal notifikation for hver opfyldt alarm.
// Bagefter huskes den nye pris, så samme fald ikke giver besked igen (nat-jobbet gør det samme
// efter en push). Har brugeren alarmer, fornyes push-tokenet også stille (uden at spørge).
// ready = profil, Favoritter, alarm og centerdata er hentet, og onboarding er gennemført.
export function usePriceAlertCheck({
  ready,
  uid,
  user,
  favorites,
  membershipAlert,
  centers,
  chains,
  onOpenCenter,
}) {
  const latest = useRef(null);
  latest.current = { uid, user, favorites, membershipAlert, centers, chains, onOpenCenter };
  const running = useRef(false);

  const runCheck = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    const state = latest.current;
    const today = new Date();
    try {
      const favoriteTriggers = favoriteAlertTriggers({
        favorites: state.favorites.favorites,
        centers: state.centers,
        chains: state.chains,
        user: state.user,
        today,
      });
      const alert = state.membershipAlert.currentMembershipAlert;
      const membershipTrigger = currentMembershipAlertTrigger({
        alert,
        centers: state.centers,
        chains: state.chains,
        user: state.user,
        today,
      });
      const triggers = membershipTrigger
        ? [membershipTrigger, ...favoriteTriggers]
        : favoriteTriggers;

      await showPriceAlerts(triggers.map(priceAlertMessage), state.onOpenCenter);

      for (const trigger of favoriteTriggers) {
        const favorite = state.favorites.favorites[trigger.centerId];
        await state.favorites.updateFavorite(
          trigger.centerId,
          markFavoriteNotified(favorite, trigger.honestYearlyPrice),
        );
      }
      if (membershipTrigger) {
        await state.membershipAlert.saveAlert(
          markCurrentMembershipAlertNotified(alert, membershipTrigger.honestYearlyPrice),
        );
      }
    } catch (error) {
      console.error('Tjek af Prisalarmer fejlede:', error);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    runCheck();
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') runCheck();
    });
    return () => subscription.remove();
  }, [ready, uid, runCheck]);

  // Tokenet kan skifte (fx ny installation); hent det igen ved opstart uden at spørge.
  const hasAlerts =
    ready &&
    hasAnyPriceAlert({
      favorites: favorites.favorites,
      currentMembershipAlert: membershipAlert.currentMembershipAlert,
    });
  useEffect(() => {
    if (!hasAlerts) return;
    registerForPush(uid).catch((error) => console.error('Gem push-token fejlede:', error));
  }, [hasAlerts, uid]);
}
