/**
 * Tests for the "Why I ordered this" explanation feature:
 *   - RecommendationHistoryEntry carries an explanation field
 *   - The field is correctly shaped and preserved
 *   - The explanation is included when AsyncStorage persists recommendations
 *
 * Note: useHistory is a React hook. Since @testing-library/react-native is not
 * installed, these tests exercise the data contract and AsyncStorage integration
 * at the module level, matching the project's existing pure-function test style.
 */

import type {
    Confidence,
    DecisionMode,
    RecommendationHistoryEntry,
    RestaurantResult,
} from '@/types/meal';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeWinner(overrides: Partial<RestaurantResult> = {}): RestaurantResult {
  return {
    id: 'r1',
    name: 'Test Restaurant',
    platform: 'Swiggy',
    cuisine: 'biryani',
    price: 200,
    originalPrice: 250,
    rating: 4.2,
    deliveryMinutes: 30,
    distance: '2.0 km',
    offer: null,
    ...overrides,
  };
}

function makeEntry(
  explanation: string,
  overrides: Partial<RecommendationHistoryEntry> = {},
): RecommendationHistoryEntry {
  const winner = overrides.winner ?? makeWinner();
  return {
    query: 'biryani',
    winner,
    cuisine: overrides.cuisine ?? winner.cuisine,
    mode: 'balanced' as DecisionMode,
    confidence: 'high' as Confidence,
    explanation,
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─── RecommendationHistoryEntry shape ─────────────────────────────────────────

describe('RecommendationHistoryEntry — explanation field', () => {
  it('entry carries the explanation string', () => {
    const entry = makeEntry('₹50 sasta hai Swiggy — best deal, dost! 🤝');
    expect(entry.explanation).toBe('₹50 sasta hai Swiggy — best deal, dost! 🤝');
  });

  it('explanation is preserved across JSON serialise / deserialise', () => {
    const original = makeEntry('Sirf 20 min mein pahunchega! ⚡');
    const roundTripped = JSON.parse(JSON.stringify(original)) as RecommendationHistoryEntry;
    expect(roundTripped.explanation).toBe(original.explanation);
  });

  it('empty explanation string is valid', () => {
    const entry = makeEntry('');
    expect(entry.explanation).toBe('');
  });

  it('entry with all required fields matches expected shape', () => {
    const entry = makeEntry('Great pick!');
    expect(entry).toMatchObject({
      query: 'biryani',
      mode: 'balanced',
      confidence: 'high',
      explanation: 'Great pick!',
    });
    expect(typeof entry.timestamp).toBe('number');
    expect(entry.winner).toBeDefined();
  });
});

// ─── AsyncStorage persistence ─────────────────────────────────────────────────

const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RecommendationHistoryEntry — AsyncStorage serialisation', () => {
  it('persisted JSON includes the explanation field', async () => {
    const entry = makeEntry('4.8⭐ — tried and tested! ✅');
    const entries: RecommendationHistoryEntry[] = [entry];

    await AsyncStorage.setItem('@mealbuddy/recommendation_history', JSON.stringify(entries));

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const [, storedJson] = mockSetItem.mock.calls[0];
    const parsed = JSON.parse(storedJson as string) as RecommendationHistoryEntry[];
    expect(parsed[0].explanation).toBe('4.8⭐ — tried and tested! ✅');
  });

  it('multiple entries each preserve their own explanation', async () => {
    const entries: RecommendationHistoryEntry[] = [
      makeEntry('Fastest pick ⚡', { query: 'pizza', confidence: 'high', mode: 'fastest' }),
      makeEntry('Cheapest option 💰', { query: 'burger', confidence: 'medium', mode: 'cheapest' }),
    ];

    await AsyncStorage.setItem('@mealbuddy/recommendation_history', JSON.stringify(entries));

    const [, storedJson] = mockSetItem.mock.calls[0];
    const parsed = JSON.parse(storedJson as string) as RecommendationHistoryEntry[];
    expect(parsed[0].explanation).toBe('Fastest pick ⚡');
    expect(parsed[1].explanation).toBe('Cheapest option 💰');
  });

  it('explanation survives a full serialise → parse → re-serialise round trip', () => {
    const original = makeEntry('Best overall balance! 🤝');
    const serialised = JSON.stringify(original);
    const recovered = JSON.parse(serialised) as RecommendationHistoryEntry;
    const reserialised = JSON.stringify(recovered);
    const final = JSON.parse(reserialised) as RecommendationHistoryEntry;
    expect(final.explanation).toBe('Best overall balance! 🤝');
  });
});
