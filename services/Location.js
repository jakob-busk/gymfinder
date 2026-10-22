import * as Location from 'expo-location';

import { formatPlaceAddress } from '../data/userProfile';

// Adresse → { latitude, longitude }. null, hvis adressen ikke kan findes.
// Bruger telefonens egen geokoder, så der skal ingen API-nøgle til.
export async function geocodeAddress(address) {
  const results = await Location.geocodeAsync(address);
  const [hit] = results ?? [];
  if (!hit) return null;
  return { latitude: hit.latitude, longitude: hit.longitude };
}

// Brugerens nuværende placering og adresse ("Brug min placering").
// Returnerer { location, address } eller null, hvis brugeren afslår adgang til placering.
// address er tom, hvis placeringen ikke kan omsættes til en adresse.
export async function getCurrentPlace() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const location = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };

  try {
    const [place] = await Location.reverseGeocodeAsync(location);
    return { location, address: formatPlaceAddress(place) };
  } catch (error) {
    console.error('Omvendt geokodning fejlede:', error);
    return { location, address: '' };
  }
}
