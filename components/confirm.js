import { Alert, Platform } from 'react-native';

// Spørger brugeren, før noget sker, med appens almindelige bekræftelse (Alert med to knapper,
// som ved "Log ud?"). På web gør react-native-web's Alert ingenting, så dér bruges browserens
// egen bekræftelse. Giver et Promise med true, hvis brugeren vælger confirmText.
export function confirmAction({ title, message, confirmText, cancelText = 'Annuller' }) {
  if (Platform.OS === 'web') {
    const ask = typeof window !== 'undefined' ? window.confirm : null;
    return Promise.resolve(ask ? ask(`${title}\n\n${message}`) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
