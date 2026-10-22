// Ansvarlig: Bastian
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GlobalStyle from '../styles/GlobalStyle';
import RonnieMascot from '../components/RonnieMascot';

// Favoritter: brugerens gemte Centre med aktuel Ærlig årspris og Prisalarmer.
// Pladsholder, indtil Favoritter og Prisalarmer er bygget.
export default function FavoritesScreen() {
  return (
    <SafeAreaView style={GlobalStyle.container} edges={['top']}>
      <Text style={GlobalStyle.title}>Favoritter</Text>
      <View style={GlobalStyle.centeredContent}>
        <RonnieMascot size="small" />
        <Text style={GlobalStyle.emptyText}>
          Du har ingen Favoritter endnu. Tryk ♥ på et Center for at følge prisen.
        </Text>
      </View>
    </SafeAreaView>
  );
}
