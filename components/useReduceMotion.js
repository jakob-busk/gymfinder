import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// true, når brugeren har slået "reducer bevægelse" til i telefonens (eller browserens)
// indstillinger. Lytter med, så et skift slår igennem med det samme.
export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
      .catch(() => false)
      .then((enabled) => {
        if (!cancelled) setReduceMotion(Boolean(enabled));
      });
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) =>
      setReduceMotion(Boolean(enabled)),
    );
    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
}
