/**
 * Persists platform connection state securely using expo-secure-store.
 * Stored as a single JSON blob so we only use one SecureStore key.
 */
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_AUTH_STATE, PlatformAuthState, PlatformKey } from './types';

const STORE_KEY = 'mealbuddy_platform_auth_v1';

export async function loadAuthState(): Promise<PlatformAuthState> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return DEFAULT_AUTH_STATE;
    const parsed = JSON.parse(raw) as Partial<PlatformAuthState>;
    // Merge with defaults to handle new platforms added in future updates
    return { ...DEFAULT_AUTH_STATE, ...parsed };
  } catch {
    return DEFAULT_AUTH_STATE;
  }
}

export async function markConnected(
  platform: PlatformKey,
  username?: string,
): Promise<void> {
  const state = await loadAuthState();
  state[platform] = { isConnected: true, username, connectedAt: Date.now() };
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(state));
}

export async function markDisconnected(platform: PlatformKey): Promise<void> {
  const state = await loadAuthState();
  state[platform] = { isConnected: false };
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(state));
}
