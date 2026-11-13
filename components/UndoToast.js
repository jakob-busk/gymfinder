import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View } from 'react-native';

import GlobalStyle, { motion } from '../styles/GlobalStyle';

// Så længe beskeden står, før den forsvinder af sig selv.
const VISIBLE_MS = 5000;

const UndoToastContext = createContext(() => {});

// Viser en lille besked nederst med "Fortryd", fx "Fjernet fra Favoritter · Fortryd".
// const showUndo = useUndoToast(); showUndo('Fjernet fra Favoritter', () => ...).
export function useUndoToast() {
  return useContext(UndoToastContext);
}

// Lægges om hele appen (App.js). Kun én besked ad gangen; en ny erstatter den gamle.
export function UndoToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    Animated.timing(opacity, {
      toValue: 0,
      duration: motion.small,
      useNativeDriver: motion.native,
    }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback(
    (message, onUndo) => {
      clearTimeout(timer.current);
      setToast({ message, onUndo, key: Date.now() });
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.small,
        easing: motion.easeOut,
        useNativeDriver: motion.native,
      }).start();
      AccessibilityInfo.announceForAccessibility?.(`${message}. Fortryd er muligt.`);
      timer.current = setTimeout(hide, VISIBLE_MS);
    },
    [hide, opacity],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleUndo = () => {
    const undo = toast?.onUndo;
    hide();
    undo?.();
  };

  return (
    <UndoToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          key={toast.key}
          style={[GlobalStyle.toast, { opacity }]}
          accessibilityLiveRegion="polite"
        >
          <View style={GlobalStyle.toastInner}>
            <Text style={GlobalStyle.toastText}>{toast.message}</Text>
            <Pressable
              onPress={handleUndo}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Fortryd"
            >
              <Text style={GlobalStyle.toastAction}>Fortryd</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </UndoToastContext.Provider>
  );
}
