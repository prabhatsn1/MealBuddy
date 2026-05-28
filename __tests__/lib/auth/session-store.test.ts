import { loadAuthState, markConnected, markDisconnected } from '@/lib/auth/session-store';
import { DEFAULT_AUTH_STATE } from '@/lib/auth/types';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store is mocked globally in jest.setup.ts
const mockGetItem = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockSetItem = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── loadAuthState ────────────────────────────────────────────────────────────

describe('loadAuthState', () => {
  it('returns DEFAULT_AUTH_STATE when nothing is stored', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    const state = await loadAuthState();
    expect(state).toEqual(DEFAULT_AUTH_STATE);
  });

  it('parses and merges stored JSON with defaults', async () => {
    const stored = {
      swiggy: { isConnected: true, username: 'Priya', connectedAt: 1700000000000 },
    };
    mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));
    const state = await loadAuthState();
    expect(state.swiggy.isConnected).toBe(true);
    expect((state.swiggy as { username?: string }).username).toBe('Priya');
    // Other platforms should still come from defaults
    expect(state.zomato.isConnected).toBe(false);
    expect(state.ubereats.isConnected).toBe(false);
  });

  it('returns DEFAULT_AUTH_STATE when stored JSON is corrupt', async () => {
    mockGetItem.mockResolvedValueOnce('not-valid-json{{{');
    const state = await loadAuthState();
    expect(state).toEqual(DEFAULT_AUTH_STATE);
  });

  it('returns DEFAULT_AUTH_STATE when SecureStore throws', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('secure store unavailable'));
    const state = await loadAuthState();
    expect(state).toEqual(DEFAULT_AUTH_STATE);
  });
});

// ─── markConnected ────────────────────────────────────────────────────────────

describe('markConnected', () => {
  beforeEach(() => {
    // loadAuthState called inside markConnected — default: nothing stored yet
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('saves isConnected=true for the platform', async () => {
    await markConnected('swiggy', 'Arjun');

    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved.swiggy.isConnected).toBe(true);
  });

  it('saves the provided username', async () => {
    await markConnected('swiggy', 'Arjun');

    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved.swiggy.username).toBe('Arjun');
  });

  it('records a connectedAt timestamp', async () => {
    const before = Date.now();
    await markConnected('zomato', 'Rahul');
    const after = Date.now();

    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved.zomato.connectedAt).toBeGreaterThanOrEqual(before);
    expect(saved.zomato.connectedAt).toBeLessThanOrEqual(after);
  });

  it('works without a username', async () => {
    await markConnected('ubereats');

    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved.ubereats.isConnected).toBe(true);
    expect(saved.ubereats.username).toBeUndefined();
  });
});

// ─── markDisconnected ─────────────────────────────────────────────────────────

describe('markDisconnected', () => {
  it('sets isConnected=false for the platform', async () => {
    const stored = {
      swiggy: { isConnected: true, username: 'Arjun', connectedAt: 1700000000000 },
      zomato: { isConnected: false },
      ubereats: { isConnected: false },
    };
    mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));
    mockSetItem.mockResolvedValue(undefined);

    await markDisconnected('swiggy');

    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved.swiggy.isConnected).toBe(false);
  });

  it('preserves connection state of other platforms', async () => {
    const stored = {
      swiggy: { isConnected: true, username: 'Arjun', connectedAt: 1700000000000 },
      zomato: { isConnected: true, username: 'Priya', connectedAt: 1700000001000 },
      ubereats: { isConnected: false },
    };
    mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));
    mockSetItem.mockResolvedValue(undefined);

    await markDisconnected('swiggy');

    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    // Swiggy disconnected
    expect(saved.swiggy.isConnected).toBe(false);
    // Zomato still connected
    expect(saved.zomato.isConnected).toBe(true);
  });
});
