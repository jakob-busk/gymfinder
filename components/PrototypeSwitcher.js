// PROTOTYPE — slettes, når en variant er valgt (se /bcj-prototype).
// Flydende bjælke nederst til at skifte mellem UI-varianter. Vises kun i udviklingsbuilds.
// ← / → på tastaturet skifter også variant på Expo web.
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

// variants: [{ key: 'A', name: 'Kort med mærker' }, ...]
export default function PrototypeSwitcher({ variants, current, onChange }) {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );
  const step = (delta) =>
    onChange(variants[(index + delta + variants.length) % variants.length].key);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKey = (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!__DEV__) return null;
  const variant = variants[index];

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <Pressable onPress={() => step(-1)} style={styles.arrow} accessibilityLabel="Forrige variant">
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.label}>
          {variant.key}
          {variant.name ? ` — ${variant.name}` : ''}
        </Text>
        <Pressable onPress={() => step(1)} style={styles.arrow} accessibilityLabel="Næste variant">
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF200',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  arrow: { paddingHorizontal: 12, paddingVertical: 6 },
  arrowText: { fontSize: 22, fontWeight: '700', color: '#000' },
  label: { fontSize: 14, fontWeight: '700', color: '#000' },
});
