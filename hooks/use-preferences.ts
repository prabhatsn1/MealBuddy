import { UserPreferences } from '@/types/meal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '@mealbuddy/preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultMode: 'balanced',
  maxPrice: 0,             // 0 = no limit
  minRating: 0,            // 0 = no limit
  minConfidenceToAct: 'medium', // gate the one-tap handoff
  autoOrderThreshold: 0,   // 0 = off
  preferCOD: false,        // off by default
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<UserPreferences>;
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      })
      .catch(() => {
        // Fall back to defaults silently
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const updatePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetPreferences = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return { preferences, isLoaded, updatePreferences, resetPreferences };
}
