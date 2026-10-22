import { View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import InfoButton from './InfoButton';
import ToggleRow from './ToggleRow';
import { DISCOUNT_GROUPS } from '../data/matchning';
import { DISCOUNT_GROUP_DESCRIPTIONS } from '../data/userProfile';

// Vælg Rabatprofil: de Rabatgrupper brugeren hører til, som kontakter i en gruppe. Man kan vælge
// flere. onChange får den nye liste, fx ['student', 'partner'].
export default function DiscountProfilePicker({ discountProfile, onChange }) {
  const toggleGroup = (group) => {
    const next = discountProfile.includes(group)
      ? discountProfile.filter((entry) => entry !== group)
      : [...discountProfile, group];
    onChange(next);
  };

  return (
    <View style={[GlobalStyle.group, GlobalStyle.groupSpaced]}>
      {Object.entries(DISCOUNT_GROUPS).map(([group, info], index) => (
        <View key={group}>
          {index > 0 && <View style={GlobalStyle.groupDivider} />}
          <ToggleRow
            label={info.label}
            description={DISCOUNT_GROUP_DESCRIPTIONS[group]}
            value={discountProfile.includes(group)}
            onChange={() => toggleGroup(group)}
            right={group === 'partner' ? <InfoButton term="trainWithPartner" /> : null}
          />
        </View>
      ))}
    </View>
  );
}
