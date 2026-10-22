import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import InfoButton from './InfoButton';
import { DISCOUNT_GROUPS } from '../data/matchning';
import { DISCOUNT_GROUP_DESCRIPTIONS } from '../data/userProfile';

// Vælg Rabatprofil: de Rabatgrupper brugeren hører til. Man kan vælge flere.
// onChange får den nye liste, fx ['student', 'partner'].
export default function DiscountProfilePicker({ discountProfile, onChange }) {
  const toggleGroup = (group) => {
    const next = discountProfile.includes(group)
      ? discountProfile.filter((entry) => entry !== group)
      : [...discountProfile, group];
    onChange(next);
  };

  return (
    <View style={GlobalStyle.choiceList}>
      {Object.entries(DISCOUNT_GROUPS).map(([group, info]) => (
        <View key={group}>
          <View style={GlobalStyle.inlineRow}>
            <ButtonComponent
              title={info.label}
              type={discountProfile.includes(group) ? 'primary' : 'secondary'}
              onPress={() => toggleGroup(group)}
            />
            {group === 'partner' && <InfoButton term="trainWithPartner" />}
          </View>
          <Text style={GlobalStyle.choiceDescription}>{DISCOUNT_GROUP_DESCRIPTIONS[group]}</Text>
        </View>
      ))}
    </View>
  );
}
