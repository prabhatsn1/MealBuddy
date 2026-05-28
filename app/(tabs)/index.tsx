import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { DecisionModePicker } from '@/components/meal/decision-mode-picker';
import { FoodCategoryChips } from '@/components/meal/food-category-chips';
import { FoodSearchBar } from '@/components/meal/food-search-bar';
import { ScalePressable } from '@/components/ui/animated-pressable';
import { FadeIn } from '@/components/ui/fade-in';
import { Brand, Colors, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHistory } from '@/hooks/use-history';
import { usePreferences } from '@/hooks/use-preferences';
import { getMealTime, MEAL_TIME_LABELS } from '@/lib/recommendation-engine';
import { DecisionMode } from '@/types/meal';

const PLATFORMS = ['🟠 Swiggy', '🔴 Zomato', '🟢 Uber Eats'];

export default function HomeScreen() {
  const [searchText, setSearchText] = useState('');
  const { preferences, isLoaded } = usePreferences();
  const [selectedMode, setSelectedMode] = useState<DecisionMode>('balanced');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { searches, recommendations, insights, repeatSuggestion } = useHistory();
  const mealTimeLabel = MEAL_TIME_LABELS[getMealTime()];

  // Sync picker with stored default mode once loaded
  useEffect(() => {
    if (isLoaded) {
      setSelectedMode(preferences.defaultMode);
    }
  }, [isLoaded, preferences.defaultMode]);

  function handleCompare() {
    const trimmed = searchText.trim();
    if (!trimmed) {
      Alert.alert('Hold on! 😅', 'Tell us what you want to eat first.');
      return;
    }
    if (process.env.EXPO_OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.push({ pathname: '/results', params: { food: trimmed, mode: selectedMode } });
  }

  function navigateWithFood(food: string) {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSearchText(food);
    router.push({ pathname: '/results', params: { food, mode: selectedMode } });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <FadeIn index={0}>
          <LinearGradient
            colors={isDark ? ['#16163A', '#0C0C1A'] : ['#EEF2FF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.brandRow}>
              <View style={styles.brandDot} />
              <Text style={styles.appName}>MealBuddy</Text>
            </View>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              {mealTimeLabel} · Find the best deal across all platforms
            </Text>
            <View style={styles.platformRow}>
              {PLATFORMS.map((p) => (
                <View
                  key={p}
                  style={[
                    styles.platformChip,
                    { backgroundColor: isDark ? theme.card : '#FFFFFF', borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.platformChipText, { color: theme.textSecondary }]}>{p}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </FadeIn>

        {/* ── Repeat suggestion ── */}
        {repeatSuggestion && (
          <FadeIn index={1}>
            <TouchableOpacity
              style={[styles.repeatCard, { backgroundColor: isDark ? '#1A1A2E' : Brand.primaryLight }]}
              onPress={() => navigateWithFood(repeatSuggestion.query)}
              activeOpacity={0.8}
            >
              <Text style={styles.repeatEmoji}>🔁</Text>
              <View style={styles.repeatTextBlock}>
                <Text style={[styles.repeatHeading, { color: Brand.primary }]}>
                  Order from your usual?
                </Text>
                <Text style={[styles.repeatSub, { color: theme.textSecondary }]}>
                  {repeatSuggestion.query.charAt(0).toUpperCase() + repeatSuggestion.query.slice(1)} from {repeatSuggestion.platform} — ordered {repeatSuggestion.count}×
                </Text>
              </View>
              <Text style={[styles.repeatArrow, { color: Brand.primary }]}>→</Text>
            </TouchableOpacity>
          </FadeIn>
        )}

        {/* ── Preference insights ── */}
        {insights.length > 0 && (
          <FadeIn index={2}>
            <View style={[styles.insightsCard, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: theme.border }]}>
              <Text style={[styles.insightsTitle, { color: theme.textSecondary }]}>YOUR PATTERNS</Text>
              {insights.map((insight) => (
                <Text key={insight.label} style={[styles.insightRow, { color: theme.text }]}>
                  {insight.icon}  {insight.label}
                </Text>
              ))}
            </View>
          </FadeIn>
        )}

        {/* ── Search ── */}
        <FadeIn index={3}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            What are you craving?
          </Text>
        </FadeIn>
        <FadeIn index={4}>
          <FoodSearchBar
            value={searchText}
            onChangeText={setSearchText}
            onSubmit={handleCompare}
          />
        </FadeIn>

        {/* ── Past searches ── */}
        {searches.length > 0 && (
          <FadeIn index={5}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Recent searches</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyRow}
            >
              {searches.slice(0, 6).map((entry) => (
                <TouchableOpacity
                  key={entry.query + entry.timestamp}
                  style={[styles.historyChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => navigateWithFood(entry.query)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.historyChipIcon}>🕐</Text>
                  <Text style={[styles.historyChipText, { color: theme.text }]}>
                    {entry.query.charAt(0).toUpperCase() + entry.query.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </FadeIn>
        )}

        {/* ── Recent Picks log (“Why I ordered this”) ── */}
        {recommendations.length > 0 && (
          <FadeIn index={6}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Recent picks</Text>
            <View style={styles.recentPicksContainer}>
              {recommendations.slice(0, 3).map((entry) => (
                <TouchableOpacity
                  key={entry.timestamp}
                  style={[styles.recentPickCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => navigateWithFood(entry.query)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recentPickHeader}>
                    <Text style={[styles.recentPickName, { color: theme.text }]}>
                      {entry.winner.name}
                    </Text>
                    <Text style={[styles.recentPickPlatform, { color: theme.textSecondary }]}>
                      {entry.winner.platform} · ₹{entry.winner.price}
                    </Text>
                  </View>
                  <Text style={[styles.recentPickExplanation, { color: theme.textSecondary }]}>
                    💡 {entry.explanation}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FadeIn>
        )}

        {/* ── Category Chips ── */}
        <FadeIn index={6}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Quick picks
          </Text>
        </FadeIn>
        <FadeIn index={7}>
          <FoodCategoryChips
            selectedFood={searchText}
            onSelect={(food) => setSearchText(food)}
          />
        </FadeIn>

        {/* ── Decision Mode ── */}
        <FadeIn index={8}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Optimise for
          </Text>
        </FadeIn>
        <FadeIn index={9}>
          <DecisionModePicker value={selectedMode} onChange={setSelectedMode} />
        </FadeIn>

        {/* ── CTA ── */}
        <FadeIn index={10}>
          <ScalePressable onPress={handleCompare} scaleDown={0.96} style={styles.ctaWrapper}>
            <LinearGradient
              colors={Brand.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>Compare Platforms</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </LinearGradient>
          </ScalePressable>
        </FadeIn>

        {/* ── Footer note ── */}
        <FadeIn index={11}>
          <Text style={[styles.footerNote, { color: theme.textSecondary }]}>
            Prices are indicative. Always verify on the platform before ordering.
          </Text>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingBottom: Spacing['5xl'],
  },
  headerGradient: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['2xl'],
    marginBottom: Spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Brand.primary,
  },
  appName: {
    ...Typography.largeTitle,
    color: Brand.primary,
  },
  tagline: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: Spacing.lg,
  },
  platformRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  platformChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  platformChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionLabel: {
    ...Typography.overline,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  ctaWrapper: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing['2xl'],
  },
  ctaButton: {
    borderRadius: Radii.lg,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.glow(Brand.primary),
  },
  ctaText: {
    color: '#FFFFFF',
    ...Typography.headline,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ctaArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footerNote: {
    ...Typography.caption1,
    textAlign: 'center',
    marginHorizontal: Spacing['3xl'],
    marginTop: Spacing.xl,
    lineHeight: 18,
  },
  // ── Repeat suggestion ──
  repeatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  repeatEmoji: {
    fontSize: 22,
  },
  repeatTextBlock: {
    flex: 1,
  },
  repeatHeading: {
    ...Typography.subheadline,
    fontWeight: '700',
  },
  repeatSub: {
    ...Typography.caption1,
    marginTop: 2,
  },
  repeatArrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  // ── Preference insights ──
  insightsCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  insightsTitle: {
    ...Typography.overline,
    marginBottom: Spacing.xs,
  },
  insightRow: {
    ...Typography.subheadline,
  },
  // ── Past searches ──
  historyRow: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  historyChipIcon: {
    fontSize: 12,
  },
  historyChipText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  // ── Recent picks log ──
  recentPicksContainer: {
    marginHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  recentPickCard: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  recentPickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentPickName: {
    ...Typography.subheadline,
    fontWeight: '700',
    flex: 1,
  },
  recentPickPlatform: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  recentPickExplanation: {
    ...Typography.caption1,
    lineHeight: 17,
    fontStyle: 'italic',
  },
});
