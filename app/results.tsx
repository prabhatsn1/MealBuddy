import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn as RNFadeIn } from 'react-native-reanimated';

import { BestChoiceBanner } from '@/components/meal/best-choice-banner';
import { ComparisonCard } from '@/components/meal/comparison-card';
import { Brand, Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { usePlatformAuth } from '@/context/platform-auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHistory } from '@/hooks/use-history';
import { useLocation } from '@/hooks/use-location';
import { usePreferences } from '@/hooks/use-preferences';
import { generateAIExplanation } from '@/lib/ai/explanation-engine';
import { DataSource, PlatformStatus, searchAllPlatforms } from '@/lib/api/food-aggregator';
import { getBestChoice } from '@/lib/recommendation-engine';
import { BestChoice, DecisionMode, ScoredResult } from '@/types/meal';

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; reason: 'no_results' | 'unknown' }
  | { status: 'success'; bestChoice: BestChoice; filtersApplied: boolean; platformStatus: PlatformStatus };

export default function ResultsScreen() {
  const { food, mode } = useLocalSearchParams<{ food: string; mode: DecisionMode }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { preferences } = usePreferences();
  const { searchViaWebView } = usePlatformAuth();
  const { addSearch, addRecommendation, favouriteCuisines } = useHistory();

  const locationState = useLocation();

  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' });
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    if (locationState.status === 'loading') return;
    setFetchState({ status: 'loading' });
    try {
      const { lat, lng } = locationState.coords;
      const { results, platformStatus } = await searchAllPlatforms(
        food ?? '',
        lat,
        lng,
        searchViaWebView,
      );
      if (results.length === 0) {
        setFetchState({ status: 'error', reason: 'no_results' });
        return;
      }
      const hasFilters = preferences.maxPrice > 0 || preferences.minRating > 0;
      const bc = getBestChoice(results, mode ?? 'balanced', preferences, favouriteCuisines);
      // Persist to history (rule-based explanation saved immediately)
      addSearch(food ?? '');
      addRecommendation(food ?? '', bc.winner, mode ?? 'balanced', bc.confidence, bc.explanation, bc.winner.cuisine);
      setFetchState({ status: 'success', bestChoice: bc, filtersApplied: hasFilters, platformStatus });
      // Generate AI explanation asynchronously (replaces rule-based text when ready)
      const runner = bc.rankedResults.length > 1 ? bc.rankedResults[1] : null;
      generateAIExplanation(bc.winner, runner, mode ?? 'balanced', bc.mealTime, bc.explanation)
        .then((text) => setAiExplanation(text))
        .catch(() => { /* fallback already set in fetchState */ });
    } catch {
      setFetchState({ status: 'error', reason: 'unknown' });
    }
  }, [food, mode, preferences, searchViaWebView, addSearch, addRecommendation, locationState]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (fetchState.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Searching…' }} />
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Brand.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Checking Zomato, Swiggy & Uber Eats…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error / empty ─────────────────────────────────────────────────────────
  if (fetchState.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Oops!' }} />
        <Animated.View entering={RNFadeIn.duration(500)} style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyEmoji}>😕</Text>
          </View>
          <Text style={[styles.emptyHeading, { color: theme.text }]}>Kuch mila nahi yaar</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            "{food}" ke liye koi restaurant nahi mila.{'\n'}Biryani, Pizza, Burger, Dosa ya Rolls try karo!
          </Text>
          <TouchableOpacity onPress={loadResults} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const { bestChoice, filtersApplied, platformStatus } = fetchState;
  const { winner, explanation, rankedResults } = bestChoice;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: `${capitalize(food ?? '')} — Comparison`,
          headerBackTitle: 'Back',
        }}
      />
      <FlatList<ScoredResult>
        data={rankedResults}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.subHeader}>
              <Text style={[styles.subHeaderText, { color: theme.textSecondary }]}>
                Comparing{' '}
                <Text style={[styles.subHeaderCount, { color: theme.text }]}>
                  {rankedResults.length} options
                </Text>
                {' '}for{' '}
                <Text style={{ color: Brand.primary, fontWeight: '700' }}>
                  {capitalize(food ?? '')}
                </Text>
              </Text>
              {locationState.status !== 'loading' && locationState.address ? (
                <View style={styles.addressChip}>
                  <Text style={styles.addressChipText} numberOfLines={1}>
                    📍 {locationState.address}
                  </Text>
                </View>
              ) : null}
              {filtersApplied && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {[
                      preferences.maxPrice > 0 ? `≤₹${preferences.maxPrice}` : null,
                      preferences.minRating > 0 ? `${preferences.minRating}+⭐` : null,
                    ]
                      .filter(Boolean)
                      .join('  ·  ')}
                  </Text>
                </View>
              )}
            </View>

            <BestChoiceBanner
              winner={winner}
              explanation={aiExplanation ?? explanation}
              confidence={bestChoice.confidence}
              tradeOff={bestChoice.tradeOff}
              warnings={bestChoice.warnings}
              food={food ?? ''}
              minConfidenceToAct={preferences.minConfidenceToAct}
              autoOrderThreshold={preferences.autoOrderThreshold}
              preferCOD={preferences.preferCOD}
            />

            {/* Platform data-source badges */}
            <View style={styles.platformStatusRow}>
              {(['zomato', 'swiggy', 'ubereats'] as const).map((key) => {
                const source: DataSource = platformStatus[key];
                const label = key === 'ubereats' ? 'Uber Eats' : key.charAt(0).toUpperCase() + key.slice(1);
                const badgeColor =
                  source === 'webview' ? '#E6F4EA' :
                  source === 'api' ? '#E8F0FE' : '#F5F5F5';
                const dotColor =
                  source === 'webview' ? '#34A853' :
                  source === 'api' ? '#4285F4' : '#9E9E9E';
                const textColor =
                  source === 'webview' ? '#1B7335' :
                  source === 'api' ? '#1A73E8' : '#666';
                const sourceLabel =
                  source === 'webview' ? '🔒 Live' :
                  source === 'api' ? '🌐 API' : '📋 Sample';
                return (
                  <View key={key} style={[styles.platformStatusChip, { backgroundColor: badgeColor }]}>
                    <View style={[styles.platformStatusDot, { backgroundColor: dotColor }]} />
                    <Text style={[styles.platformStatusText, { color: textColor }]}>
                      {label}  {sourceLabel}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
              Sabhi Options 👇
            </Text>
          </>
        }
        renderItem={({ item, index }) => (
          <ComparisonCard
            result={item}
            rank={index + 1}
            isWinner={item.id === winner.id}
          />
        )}
        ItemSeparatorComponent={() => null}
      />
    </SafeAreaView>
  );
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  list: {
    paddingBottom: Spacing['5xl'],
  },
  subHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  subHeaderText: {
    ...Typography.subheadline,
  },
  subHeaderCount: {
    fontWeight: '700',
  },
  filterBadge: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: Brand.primaryLight,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  filterBadgeText: {
    ...Typography.caption1,
    color: Brand.primary,
    fontWeight: '700',
  },
  addressChip: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
    maxWidth: 260,
  },
  addressChipText: {
    ...Typography.caption1,
    color: '#555',
  },
  sectionHeading: {
    ...Typography.overline,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['4xl'],
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Brand.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyHeading: {
    ...Typography.title2,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  emptySub: {
    ...Typography.callout,
    textAlign: 'center',
  },
  loadingText: {
    ...Typography.callout,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    backgroundColor: Brand.primary,
    borderRadius: Radii.full,
  },
  retryText: {
    ...Typography.callout,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  platformStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  platformStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  platformStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  platformStatusText: {
    ...Typography.caption1,
    fontWeight: '600',
  },
});
