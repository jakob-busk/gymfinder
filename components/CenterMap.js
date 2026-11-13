import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import GlobalStyle, { brand, colors } from '../styles/GlobalStyle';
import { mapRegion, pinKind } from '../data/findView';

// Kort med brugerens egen pin og én pin pr. Center i matches (CenterMatch fra Matchning).
// Centrene er prikker i tre størrelser (se pinKind): det Anbefalede Center er størst med en tyk
// ring, hver Kædes bedste Center (fra chains, ChainMatch fra Matchning) er en mellemstor blækprik,
// og Kædernes andre Centre er små, dæmpede prikker. Så kan det ses uden en ekstra farve. Din egen
// placering er en violet pin. onSelect(centerId) kaldes ved tryk på en Center-pin.
// Uden provider bruges Apple Maps på iOS og Google Maps på Android, så det virker i Expo Go.
// Pinnens udseende og hvilke pins der ligger øverst, efter pinKind.
const PIN_STYLES = {
  recommended: GlobalStyle.mapPinRecommended,
  chainBest: GlobalStyle.mapPinChainBest,
  center: GlobalStyle.mapPinCenter,
};
const PIN_Z_INDEX = { recommended: 2, chainBest: 1, center: 0 };

export default function CenterMap({ userLocation, matches, chains, recommendedId, onSelect }) {
  const mapRef = useRef(null);
  const region = mapRegion(userLocation, matches);

  // Flyt udsnittet, når Filtre eller placering ændrer, hvilke Centre der vises. Effekten afhænger
  // bevidst af pin-id'erne og ikke af region, så en ny sortering ikke flytter kortet.
  const pinKey = matches
    .map((match) => match.center.id)
    .sort()
    .join('|');
  useEffect(() => {
    mapRef.current?.animateToRegion(region, 400);
  }, [pinKey, userLocation?.latitude, userLocation?.longitude]);

  return (
    // Android (Google Maps) får en lys, afdæmpet kortstil. Apple Maps kan ikke styles, så iPhone
    // viser bare kortet i lys tilstand.
    <MapView
      ref={mapRef}
      style={GlobalStyle.map}
      initialRegion={region}
      customMapStyle={brand.mapStyle}
      userInterfaceStyle={brand.mapInterfaceStyle}
    >
      {userLocation && (
        <Marker
          coordinate={userLocation}
          title="Dig"
          description="Afstande regnes herfra"
          pinColor={colors.userPin}
        />
      )}
      {matches.map(({ center }) => {
        const kind = pinKind(center.id, { chains, recommendedId });
        return (
          <Marker
            // Nøglen skifter med pinnens slags, da Android ikke altid tegner en pin om, når den
            // ændres.
            key={`${center.id}-${kind}`}
            coordinate={center.location}
            zIndex={PIN_Z_INDEX[kind]}
            onPress={() => onSelect(center.id)}
            accessibilityLabel={center.name}
          >
            <View style={PIN_STYLES[kind]} />
          </Marker>
        );
      })}
    </MapView>
  );
}
