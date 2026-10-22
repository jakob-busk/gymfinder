import { useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';

import GlobalStyle, { colors } from '../styles/GlobalStyle';
import { mapRegion } from '../data/findView';

// Kort med brugerens egen pin og én pin pr. Center i matches (CenterMatch fra Matchning).
// Det Anbefalede Center har sin egen farve. onSelect(centerId) kaldes ved tryk på en Center-pin.
// Uden provider bruges Apple Maps på iOS og Google Maps på Android, så det virker i Expo Go.
export default function CenterMap({ userLocation, matches, recommendedId, onSelect }) {
  const mapRef = useRef(null);
  const region = mapRegion(userLocation, matches);

  // Flyt udsnittet, når Filtre eller placering ændrer, hvilke Centre der vises. Effekten afhænger
  // bevidst af pin-id'erne og ikke af region, så en ny sortering ikke flytter kortet.
  const pinKey = matches.map((match) => match.center.id).sort().join('|');
  useEffect(() => {
    mapRef.current?.animateToRegion(region, 400);
  }, [pinKey, userLocation?.latitude, userLocation?.longitude]);

  return (
    <MapView ref={mapRef} style={GlobalStyle.map} initialRegion={region}>
      {userLocation && (
        <Marker
          coordinate={userLocation}
          title="Dig"
          description="Afstande regnes herfra"
          pinColor={colors.userPin}
        />
      )}
      {matches.map(({ center }) => {
        const isRecommended = center.id === recommendedId;
        return (
          <Marker
            // Nøglen skifter med Anbefalet, da Android ikke altid opdaterer pinColor på en pin.
            key={`${center.id}-${isRecommended}`}
            coordinate={center.location}
            pinColor={isRecommended ? colors.recommendedPin : colors.primary}
            zIndex={isRecommended ? 1 : 0}
            onPress={() => onSelect(center.id)}
            accessibilityLabel={center.name}
          />
        );
      })}
    </MapView>
  );
}
