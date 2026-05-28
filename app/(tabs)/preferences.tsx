import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import { ScalePressable } from '@/components/ui/animated-pressable';
import { FadeIn } from '@/components/ui/fade-in';
import { Brand, Colors, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { usePlatformAuth } from '@/context/platform-auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePreferences } from '@/hooks/use-preferences';
import { PLATFORM_CONFIGS } from '@/lib/auth/types';
import { Confidence, DecisionMode } from '@/types/meal';

// ── Decision modes ────────────────────────────────────────────────────────────

const MODES: { mode: DecisionMode; icon: string; label: string; description: string }[] = [
  { mode: 'balanced', icon: '🤝', label: 'Best Deal', description: 'Balances price, speed & rating' },
  { mode: 'cheapest', icon: '💰', label: 'Sasta', description: 'Lowest price wins, always' },
  { mode: 'fastest', icon: '⚡', label: 'Fast', description: 'Get food ASAP, no matter what' },
  { mode: 'bestRated', icon: '⭐', label: 'Top Rated', description: 'Community-approved only' },
];

// ── Price presets ─────────────────────────────────────────────────────────────

const PRICE_PRESETS = [
  { label: 'No limit', value: 0 },
  { label: '< ₹200', value: 200 },
  { label: '< ₹300', value: 300 },
  { label: '< ₹500', value: 500 },
];

// ── Rating presets ────────────────────────────────────────────────────────────

const RATING_PRESETS = [
  { label: 'No limit', value: 0 },
  { label: '3.5+', value: 3.5 },
  { label: '4.0+', value: 4.0 },
  { label: '4.5+', value: 4.5 },
];

// ── Confidence threshold presets ──────────────────────────────────────────────

const CONFIDENCE_PRESETS: { label: string; value: Confidence; description: string }[] = [
  { label: 'Low+', value: 'low', description: 'Act even on low confidence' },
  { label: 'Medium+', value: 'medium', description: 'Recommended default' },
  { label: 'High only', value: 'high', description: 'Only when very sure' },
];

// ── Auto-order threshold presets ──────────────────────────────────────────────

const AUTO_ORDER_PRESETS = [
  { label: 'Off', value: 0 },
  { label: '< ₹200', value: 200 },
  { label: '< ₹300', value: 300 },
  { label: '< ₹500', value: 500 },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function PreferencesScreen() {
  const { preferences, isLoaded, updatePreferences, resetPreferences } = usePreferences();
  const { authState, openLogin, disconnect } = usePlatformAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  if (!isLoaded) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} />;
  }

  function haptic() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handleReset() {
    Alert.alert(
      'Reset Preferences?',
      'Sabhi settings default pe waapis ho jaayengi.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            haptic();
            resetPreferences();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <FadeIn index={0}>
          <LinearGradient
            colors={isDark ? ['#16163A', '#0C0C1A'] : ['#EEF2FF', '#F9FAFB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerEmoji}>⚙️</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Preferences</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Personalise how MealBuddy recommends for you
            </Text>
          </LinearGradient>
        </FadeIn>

        {/* ── Default Decision Mode ── */}
        <FadeIn index={1}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              DEFAULT DECISION MODE
            </Text>
            <View style={[styles.card, { backgroundColor: theme.card, ...Shadows.md }]}>
              {MODES.map(({ mode, icon, label, description }, i) => {
                const isActive = preferences.defaultMode === mode;
                return (
                  <ScalePressable
                    key={mode}
                    onPress={() => {
                      haptic();
                      updatePreferences({ defaultMode: mode });
                    }}
                    scaleDown={0.97}
                  >
                    <View
                      style={[
                        styles.modeRow,
                        i < MODES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                      ]}
                    >
                      <View style={styles.modeLeft}>
                        <Text style={styles.modeIcon}>{icon}</Text>
                        <View>
                          <Text style={[styles.modeLabel, { color: theme.text }]}>{label}</Text>
                          <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>{description}</Text>
                        </View>
                      </View>
                      <View style={[styles.radioOuter, { borderColor: isActive ? Brand.primary : theme.border }]}>
                        {isActive && <View style={styles.radioInner} />}
                      </View>
                    </View>
                  </ScalePressable>
                );
              })}
            </View>
          </View>
        </FadeIn>

        {/* ── Max Price ── */}
        <FadeIn index={2}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              MAX PRICE PER ORDER
            </Text>
            <View style={styles.presetRow}>
              {PRICE_PRESETS.map(({ label, value }) => {
                const isActive = preferences.maxPrice === value;
                return (
                  <ScalePressable
                    key={value}
                    onPress={() => {
                      haptic();
                      updatePreferences({ maxPrice: value });
                    }}
                    scaleDown={0.93}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={Brand.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.presetChip}
                      >
                        <Text style={styles.presetLabelActive}>{label}</Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.presetChip,
                          { backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border },
                        ]}
                      >
                        <Text style={[styles.presetLabel, { color: theme.text }]}>{label}</Text>
                      </View>
                    )}
                  </ScalePressable>
                );
              })}
            </View>
            {preferences.maxPrice > 0 && (
              <Text style={[styles.presetHint, { color: theme.textSecondary }]}>
                Results above ₹{preferences.maxPrice} will be filtered out
              </Text>
            )}
          </View>
        </FadeIn>

        {/* ── Min Rating ── */}
        <FadeIn index={3}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              MINIMUM RATING
            </Text>
            <View style={styles.presetRow}>
              {RATING_PRESETS.map(({ label, value }) => {
                const isActive = preferences.minRating === value;
                return (
                  <ScalePressable
                    key={value}
                    onPress={() => {
                      haptic();
                      updatePreferences({ minRating: value });
                    }}
                    scaleDown={0.93}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={Brand.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.presetChip}
                      >
                        <Text style={styles.presetLabelActive}>{label}</Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.presetChip,
                          { backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border },
                        ]}
                      >
                        <Text style={[styles.presetLabel, { color: theme.text }]}>{label}</Text>
                      </View>
                    )}
                  </ScalePressable>
                );
              })}
            </View>
            {preferences.minRating > 0 && (
              <Text style={[styles.presetHint, { color: theme.textSecondary }]}>
                Restaurants below {preferences.minRating}⭐ will be filtered out
              </Text>
            )}
          </View>
        </FadeIn>

        {/* ── Confidence Threshold ── */}
        <FadeIn index={4}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              CONFIDENCE THRESHOLD
            </Text>
            <Text style={[styles.presetHint, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
              Show "Ready to Order?" only when MealBuddy is at least this confident
            </Text>
            <View style={[styles.card, { backgroundColor: theme.card, ...Shadows.md }]}>
              {CONFIDENCE_PRESETS.map(({ label, value, description }, i) => {
                const isActive = preferences.minConfidenceToAct === value;
                return (
                  <ScalePressable
                    key={value}
                    onPress={() => { haptic(); updatePreferences({ minConfidenceToAct: value }); }}
                    scaleDown={0.97}
                  >
                    <View
                      style={[
                        styles.modeRow,
                        i < CONFIDENCE_PRESETS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                      ]}
                    >
                      <View style={styles.modeLeft}>
                        <View>
                          <Text style={[styles.modeLabel, { color: theme.text }]}>{label}</Text>
                          <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>{description}</Text>
                        </View>
                      </View>
                      <View style={[styles.radioOuter, { borderColor: isActive ? Brand.primary : theme.border }]}>
                        {isActive && <View style={styles.radioInner} />}
                      </View>
                    </View>
                  </ScalePressable>
                );
              })}
            </View>
          </View>
        </FadeIn>

        {/* ── Auto-Order Threshold ── */}
        <FadeIn index={5}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              AUTO-ORDER THRESHOLD
            </Text>
            <Text style={[styles.presetHint, { color: theme.textSecondary, marginBottom: Spacing.sm }]}>
              When the best pick is under this price, the "Ready to Order?" button is pre-armed automatically
            </Text>
            <View style={styles.presetRow}>
              {AUTO_ORDER_PRESETS.map(({ label, value }) => {
                const isActive = preferences.autoOrderThreshold === value;
                return (
                  <ScalePressable
                    key={value}
                    onPress={() => { haptic(); updatePreferences({ autoOrderThreshold: value }); }}
                    scaleDown={0.93}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={Brand.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.presetChip}
                      >
                        <Text style={styles.presetLabelActive}>{label}</Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.presetChip,
                          { backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border },
                        ]}
                      >
                        <Text style={[styles.presetLabel, { color: theme.text }]}>{label}</Text>
                      </View>
                    )}
                  </ScalePressable>
                );
              })}
            </View>
            {preferences.autoOrderThreshold > 0 && (
              <Text style={[styles.presetHint, { color: theme.textSecondary }]}>
                🤖 Auto-arms when best pick is ₹{preferences.autoOrderThreshold} or less (and confidence meets your threshold)
              </Text>
            )}
          </View>
        </FadeIn>

        {/* ── Cash on Delivery ── */}
        <FadeIn index={6}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              PAYMENT PREFERENCE
            </Text>
            <View style={[styles.card, { backgroundColor: theme.card, ...Shadows.md }]}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={styles.toggleIcon}>💵</Text>
                  <View>
                    <Text style={[styles.modeLabel, { color: theme.text }]}>Prefer Cash on Delivery</Text>
                    <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>
                      Reminds you to select COD when ordering
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.preferCOD}
                  onValueChange={(val) => {
                    haptic();
                    updatePreferences({ preferCOD: val });
                  }}
                  trackColor={{ false: theme.border, true: Brand.primary }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ── Active Filters Summary ── */}
        {(preferences.maxPrice > 0 || preferences.minRating > 0) && (
          <FadeIn index={7}>>
              <Text style={[styles.summaryTitle, { color: Brand.primary }]}>Active Filters</Text>
              {preferences.maxPrice > 0 && (
                <Text style={[styles.summaryItem, { color: theme.text }]}>
                  💰 Max price: ₹{preferences.maxPrice}
                </Text>
              )}
              {preferences.minRating > 0 && (
                <Text style={[styles.summaryItem, { color: theme.text }]}>
                  ⭐ Min rating: {preferences.minRating}+
                </Text>
              )}
            </View>
          </FadeIn>
        )}

        {/* ── Connected Accounts ── */}
        <FadeIn index={8}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              CONNECTED ACCOUNTS
            </Text>
            <Text style={[styles.accountsHint, { color: theme.textSecondary }]}>
              Log in once — MealBuddy searches using your authenticated session for live prices & personal deals.
            </Text>
            <View style={[styles.card, { backgroundColor: theme.card, ...Shadows.md }]}>
              {PLATFORM_CONFIGS.map(({ key, label, emoji, color }, i) => {
                const conn = authState[key];
                return (
                  <View
                    key={key}
                    style={[
                      styles.accountRow,
                      i < PLATFORM_CONFIGS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={styles.accountLeft}>
                      <Text style={styles.accountEmoji}>{emoji}</Text>
                      <View>
                        <Text style={[styles.accountLabel, { color: theme.text }]}>{label}</Text>
                        {conn.isConnected ? (
                          <Text style={[styles.accountStatus, { color: '#34A853' }]}>
                            ✓ Connected{conn.username ? ` · ${conn.username}` : ''}
                          </Text>
                        ) : (
                          <Text style={[styles.accountStatus, { color: theme.textSecondary }]}>
                            Not connected · using sample data
                          </Text>
                        )}
                      </View>
                    </View>
                    {conn.isConnected ? (
                      <ScalePressable
                        onPress={() => {
                          haptic();
                          Alert.alert(
                            `Disconnect ${label}?`,
                            'You will be shown sample data until you connect again.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Disconnect', style: 'destructive', onPress: () => disconnect(key) },
                            ],
                          );
                        }}
                        scaleDown={0.93}
                      >
                        <View style={[styles.disconnectBtn, { borderColor: '#EF4444' }]}>
                          <Text style={styles.disconnectText}>Disconnect</Text>
                        </View>
                      </ScalePressable>
                    ) : (
                      <ScalePressable
                        onPress={() => { haptic(); openLogin(key); }}
                        scaleDown={0.93}
                      >
                        <LinearGradient
                          colors={[color, color + 'CC']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.connectBtn}
                        >
                          <Text style={styles.connectText}>Connect</Text>
                        </LinearGradient>
                      </ScalePressable>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </FadeIn>

        {/* ── Reset ── */}
        <FadeIn index={9}>
          <ScalePressable onPress={handleReset} scaleDown={0.96}>
            <View style={[styles.resetBtn, { borderColor: '#EF4444' }]}>
              <Text style={styles.resetLabel}>Reset to Defaults</Text>
            </View>
          </ScalePressable>
        </FadeIn>

        <View style={{ height: Spacing['4xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: Spacing['5xl'] },

  header: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  headerEmoji: { fontSize: 40 },
  headerTitle: { ...Typography.title1, textAlign: 'center' },
  headerSubtitle: { ...Typography.callout, textAlign: 'center' },

  section: { paddingHorizontal: Spacing.xl, marginTop: Spacing['2xl'] },
  sectionTitle: { ...Typography.overline, marginBottom: Spacing.sm },

  card: { borderRadius: Radii.lg, overflow: 'hidden' },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  modeIcon: { fontSize: 22 },
  modeLabel: { ...Typography.headline },
  modeDesc: { ...Typography.footnote, marginTop: 2 },
  toggleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  toggleLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.md, flex: 1 },
  toggleIcon: { fontSize: 22 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: Brand.primary },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  presetChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  presetLabel: { ...Typography.subheadline, fontWeight: '600' },
  presetLabelActive: { ...Typography.subheadline, fontWeight: '600', color: '#fff' },
  presetHint: { ...Typography.footnote, marginTop: Spacing.sm },

  summaryCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing['2xl'],
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  summaryTitle: { ...Typography.headline },
  summaryItem: { ...Typography.callout },

  resetBtn: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing['2xl'],
    borderWidth: 1.5,
    borderRadius: Radii.lg,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resetLabel: { ...Typography.headline, color: '#EF4444' },

  // ── Connected accounts ──
  accountsHint: {
    ...Typography.footnote,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  accountLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  accountEmoji: { fontSize: 22 },
  accountLabel: { ...Typography.headline },
  accountStatus: { ...Typography.footnote, marginTop: 2 },
  connectBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 7,
    borderRadius: Radii.full,
  },
  connectText: { ...Typography.subheadline, color: '#fff', fontWeight: '700' },
  disconnectBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1.5,
  },
  disconnectText: { ...Typography.footnote, color: '#EF4444', fontWeight: '700' },
});
