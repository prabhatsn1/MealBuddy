import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

const DEFAULT_LAT = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LAT ?? '28.6139');
const DEFAULT_LNG = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LNG ?? '77.2090');

export type LocationCoords = { lat: number; lng: number };

type LocationState =
  | { status: 'loading' }
  | { status: 'granted'; coords: LocationCoords; address: string }
  | { status: 'denied'; coords: LocationCoords; address: null };

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const place = results[0];
    if (!place) return null;
    const parts = [
      place.name ?? place.street,
      place.district ?? place.city,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : (place.city ?? null);
  } catch {
    return null;
  }
}

export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status !== 'granted') {
          setState({ status: 'denied', coords: { lat: DEFAULT_LAT, lng: DEFAULT_LNG }, address: null });
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const { latitude: lat, longitude: lng } = location.coords;
        const address = await reverseGeocode(lat, lng);
        if (cancelled) return;

        setState({
          status: 'granted',
          coords: { lat, lng },
          address: address ?? '',
        });
      } catch {
        if (!cancelled) {
          setState({ status: 'denied', coords: { lat: DEFAULT_LAT, lng: DEFAULT_LNG }, address: null });
        }
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, []);

  return state;
}
