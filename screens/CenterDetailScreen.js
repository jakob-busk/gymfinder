// Ansvarlig: Christian
import { Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import { useCenterData } from '../services/CenterData';

// Centerdetalje: adresse, faciliteter, alle Tilbud med prisudregning måned for måned.
// Pladsholder, der viser det valgte Center ud fra centerId i route-params.
export default function CenterDetailScreen({ route }) {
  const centerId = route?.params?.centerId;
  const { centers, chains } = useCenterData();
  const center = centers.find((entry) => entry.id === centerId);
  const chain = chains.find((entry) => entry.id === center?.chainId);

  if (!center) {
    return (
      <View style={GlobalStyle.container}>
        <Text style={GlobalStyle.emptyText}>Centret blev ikke fundet.</Text>
      </View>
    );
  }

  return (
    <View style={GlobalStyle.container}>
      <Text style={GlobalStyle.title}>{center.name}</Text>
      <Text>{chain?.name}</Text>
      <Text>{center.address}</Text>
      <Text style={GlobalStyle.noticeText}>
        Prisudregning og alle Tilbud i Centret kommer her.
      </Text>
    </View>
  );
}
