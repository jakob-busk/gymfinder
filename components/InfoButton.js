import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import { EXPLANATIONS } from '../data/explanations';

// ⓘ ved et fagord. Et tryk åbner en infoboks med forklaringen fra data/explanations.js.
// term er en nøgle i EXPLANATIONS, fx 'honestYearlyPrice'.
export default function InfoButton({ term }) {
  const [visible, setVisible] = useState(false);
  const explanation = EXPLANATIONS[term];

  if (!explanation) return null;

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Hvad betyder ${explanation.title}?`}
      >
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={GlobalStyle.modalBackdrop} onPress={() => setVisible(false)}>
          {/* Pressable uden handling, så et tryk i selve boksen ikke lukker den. */}
          <Pressable style={GlobalStyle.modalCard}>
            <View style={GlobalStyle.inlineRow}>
              <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
              <Text style={GlobalStyle.modalTitle}>{explanation.title}</Text>
            </View>
            <Text style={GlobalStyle.modalText}>{explanation.text}</Text>
            <ButtonComponent title="Forstået" type="primary" onPress={() => setVisible(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
