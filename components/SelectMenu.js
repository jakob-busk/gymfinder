import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GlobalStyle, { colors } from '../styles/GlobalStyle';

// Et felt, der viser det valgte og åbner en liste nedefra (dropdown), fx sortering eller Kæde.
// options er [{ value, label }]. label står foran værdien i feltet, fx "Sortér".
// placeholder vises, når intet er valgt; allowNone tilføjer et "Ingen"-valg (value null).
export default function SelectMenu({
  label,
  title,
  value,
  options,
  onChange,
  icon,
  placeholder = 'Vælg',
  allowNone = false,
  full = false,
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const choices = allowNone ? [{ value: null, label: 'Ingen' }, ...options] : options;

  const choose = (next) => {
    setOpen(false);
    onChange(next);
  };

  return (
    <>
      <Pressable
        style={[GlobalStyle.selectField, full && GlobalStyle.buttonFull]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? title}: ${selected?.label ?? placeholder}`}
      >
        {icon && <Ionicons name={icon} size={16} color={colors.muted} />}
        {label && <Text style={GlobalStyle.selectLabel}>{label}</Text>}
        <Text
          style={[GlobalStyle.selectValue, full && GlobalStyle.selectValueFull]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={GlobalStyle.sheetBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={GlobalStyle.sheet}>
            <View style={GlobalStyle.sheetHandle} />
            <Text style={GlobalStyle.sheetTitle}>{title ?? label}</Text>
            {choices.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={String(option.value)}
                  style={GlobalStyle.sheetOption}
                  onPress={() => choose(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={GlobalStyle.sheetOptionText}>{option.label}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
