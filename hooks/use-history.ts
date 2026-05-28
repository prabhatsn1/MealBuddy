/**
 * useHistory
 * ─────────────────────────────────────────────────────────────────────────────
 * Persists:
 *   • Past searches   — deduplicated, newest-first, capped at MAX_SEARCHES
 *   • Past recommendations — full winner detail, newest-first, capped at MAX_RECOS
 *
 * Derived:
 *   • repeatSuggestion  — most-ordered food + platform if ordered 2+ times
 *   • preferenceInsights — rule-based observations ("You usually order under ₹300")
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
    Confidence,
    DecisionMode,
    RecommendationHistoryEntry,
    RestaurantResult,
    SearchHistoryEntry,
} from '@/types/meal';

const SEARCH_KEY = '@mealbuddy/search_history';
const RECO_KEY   = '@mealbuddy/recommendation_history';
const MAX_SEARCHES = 10;
const MAX_RECOS    = 20;

// ── Derived insight types ─────────────────────────────────────────────────────

export interface RepeatSuggestion {
  query: string;
  platform: string;
  count: number;
}

export interface PreferenceInsight {
  icon: string;
  label: string;
}

function deriveInsights(recos: RecommendationHistoryEntry[]): PreferenceInsight[] {
  if (recos.length < 3) return [];
  const insights: PreferenceInsight[] = [];

  const prices = recos.map((r) => r.winner.price);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  // Round to nearest ₹50 bracket for a clean label
  const priceBracket = Math.ceil(avgPrice / 50) * 50;
  insights.push({ icon: '💰', label: `You usually order under ₹${priceBracket}` });

  const ratings = recos.map((r) => r.winner.rating);
  const avgRating = parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1));
  if (avgRating >= 3.5) {
    insights.push({ icon: '⭐', label: `You prefer ${avgRating}⭐+ restaurants` });
  }

  // Most-used platform
  const platformCount: Record<string, number> = {};
  recos.forEach((r) => {
    platformCount[r.winner.platform] = (platformCount[r.winner.platform] ?? 0) + 1;
  });
  const topPlatform = Object.entries(platformCount).sort((a, b) => b[1] - a[1])[0];
  if (topPlatform && topPlatform[1] >= 2) {
    insights.push({ icon: '📱', label: `You often order from ${topPlatform[0]}` });
  }

  // Favourite cuisine
  const cuisineCount: Record<string, number> = {};
  recos.forEach((r) => {
    if (r.cuisine) {
      const key = r.cuisine.toLowerCase();
      cuisineCount[key] = (cuisineCount[key] ?? 0) + 1;
    }
  });
  const topCuisine = Object.entries(cuisineCount).sort((a, b) => b[1] - a[1])[0];
  if (topCuisine && topCuisine[1] >= 2) {
    const label = topCuisine[0].charAt(0).toUpperCase() + topCuisine[0].slice(1);
    insights.push({ icon: '🍽️', label: `Your go-to cuisine is ${label}` });
  }

  return insights;
}

/** Returns the top N cuisine tags ordered by frequency in recent recommendations. */
function deriveFavouriteCuisines(recos: RecommendationHistoryEntry[], topN = 3): string[] {
  const cuisineCount: Record<string, number> = {};
  recos.forEach((r) => {
    if (r.cuisine) {
      const key = r.cuisine.toLowerCase();
      cuisineCount[key] = (cuisineCount[key] ?? 0) + 1;
    }
  });
  return Object.entries(cuisineCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([c]) => c);
}

function deriveRepeat(recos: RecommendationHistoryEntry[]): RepeatSuggestion | null {
  if (recos.length < 2) return null;
  const counts: Record<string, { platform: string; count: number }> = {};
  recos.forEach((r) => {
    const key = r.query.toLowerCase();
    if (!counts[key]) counts[key] = { platform: r.winner.platform, count: 0 };
    counts[key].count += 1;
  });
  const [topQuery, info] = Object.entries(counts).sort((a, b) => b[1].count - a[1].count)[0] ?? [];
  if (!topQuery || info.count < 2) return null;
  return { query: topQuery, platform: info.platform, count: info.count };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHistory() {
  const [searches, setSearches] = useState<SearchHistoryEntry[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SEARCH_KEY),
      AsyncStorage.getItem(RECO_KEY),
    ])
      .then(([rawSearches, rawRecos]) => {
        if (rawSearches) setSearches(JSON.parse(rawSearches) as SearchHistoryEntry[]);
        if (rawRecos) setRecommendations(JSON.parse(rawRecos) as RecommendationHistoryEntry[]);
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    setSearches((prev) => {
      // Move to front if already exists, otherwise prepend
      const deduped = [
        { query: trimmed, timestamp: Date.now() },
        ...prev.filter((s) => s.query !== trimmed),
      ].slice(0, MAX_SEARCHES);
      AsyncStorage.setItem(SEARCH_KEY, JSON.stringify(deduped)).catch(() => {});
      return deduped;
    });
  }, []);

  const addRecommendation = useCallback(
    (
      query: string,
      winner: RestaurantResult,
      mode: DecisionMode,
      confidence: Confidence,
      explanation: string,
      cuisine: string,
    ) => {
      setRecommendations((prev) => {
        const next: RecommendationHistoryEntry[] = [
          { query: query.toLowerCase(), winner, mode, confidence, explanation, cuisine, timestamp: Date.now() },
          ...prev,
        ].slice(0, MAX_RECOS);
        AsyncStorage.setItem(RECO_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const clearHistory = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(SEARCH_KEY),
      AsyncStorage.removeItem(RECO_KEY),
    ]).catch(() => {});
    setSearches([]);
    setRecommendations([]);
  }, []);

  const insights = deriveInsights(recommendations);
  const repeatSuggestion = deriveRepeat(recommendations);
  const favouriteCuisines = deriveFavouriteCuisines(recommendations);

  return {
    searches,
    recommendations,
    isLoaded,
    addSearch,
    addRecommendation,
    clearHistory,
    insights,
    repeatSuggestion,
    favouriteCuisines,
  };
}
