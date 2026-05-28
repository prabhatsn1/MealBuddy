import { FadeIn } from '@/components/ui/fade-in';
import { Brand, Colors, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DECISION_MODE_LABELS } from '@/lib/recommendation-engine';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const HOW_IT_WORKS_STEPS = [
  {
    emoji: '🔍',
    heading: 'Type karo apni craving',
    body: 'Search bar mein likho kya khaoge — Biryani, Pizza, Burger, Dosa ya Rolls. Ya neeche diye chips pe tap karo!',
  },
  {
    emoji: '🎯',
    heading: 'Mode choose karo',
    body: 'Decide karo — sabse sasta chahiye, sabse fast, sabse best, ya balanced deal? Har mode alag tarike se compare karta hai.',
  },
  {
    emoji: '⚡',
    heading: 'Compare Karo tap karo',
    body: 'Hum ek saath Swiggy, Zomato aur Uber Eats pe dekh ke best option suggest karte hain.',
  },
  {
    emoji: '✅',
    heading: '"Yahi lo, dost!" dekhо',
    body: 'Aapka best pick clearly highlight hoga — explanation ke saath ki kyun yahi best hai.',
  },
];

const MODE_INFO = [
  {
    mode: 'cheapest' as const,
    description: 'Jo sab mein sasta hai, woh aayega pehle. Tight budget? Yahi mode use karo.',
  },
  {
    mode: 'fastest' as const,
    description: 'Jo sabse jaldi deliver kare. Bhookh lag rahi hai bahut? Yahi chunо.',
  },
  {
    mode: 'bestRated' as const,
    description: 'Jo sabse zyada ratings mili hain. Quality first? Perfect choice.',
  },
  {
    mode: 'balanced' as const,
    description: 'Price + Time + Rating — teeno ka balance. Hamara recommended default. 😊',
  },
];

export default function HowItWorksScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <FadeIn index={0}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: Brand.primary }]}>Kaise Kaam Karta Hai?</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              MealBuddy ko samjho — simple hai, promise! ℹ️
            </Text>
          </View>
        </FadeIn>

        {/* Steps */}
        <View style={styles.section}>
          <FadeIn index={1}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Step by step</Text>
          </FadeIn>
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <FadeIn key={i} index={i + 2}>
              <View style={styles.stepCard}>
                <View style={styles.stepLeft}>
                  <View style={[styles.stepEmojiContainer, { backgroundColor: theme.card }]}>
                    <Text style={styles.stepEmoji}>{step.emoji}</Text>
                  </View>
                  {i < HOW_IT_WORKS_STEPS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: theme.border }]} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepHeading, { color: theme.text }]}>{step.heading}</Text>
                  <Text style={[styles.stepBody, { color: theme.textSecondary }]}>{step.body}</Text>
                </View>
              </View>
            </FadeIn>
          ))}
        </View>

        {/* Decision Mode Guide */}
        <View style={styles.section}>
          <FadeIn index={6}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Decision Modes</Text>
          </FadeIn>
          {MODE_INFO.map(({ mode, description }, i) => (
            <FadeIn key={mode} index={i + 7}>
              <View style={[styles.modeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.modeName, { color: theme.text }]}>{DECISION_MODE_LABELS[mode]}</Text>
                <Text style={[styles.modeDesc, { color: theme.textSecondary }]}>{description}</Text>
              </View>
            </FadeIn>
          ))}
        </View>

        {/* Platforms */}
        <View style={styles.section}>
          <FadeIn index={11}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Kaunse Platforms?</Text>
          </FadeIn>
          <FadeIn index={12}>
            <View style={styles.platformRow}>
              {[
                { name: 'Swiggy', color: Brand.swiggy },
                { name: 'Zomato', color: Brand.zomato },
                { name: 'Uber Eats', color: Brand.uberEats },
              ].map(({ name, color }) => (
                <View
                  key={name}
                  style={[
                    styles.platformChip,
                    { backgroundColor: color + '12', borderColor: color + '40' },
                  ]}
                >
                  <View style={[styles.platformDot, { backgroundColor: color }]} />
                  <Text style={[styles.platformName, { color }]}>{name}</Text>
                </View>
              ))}
            </View>
          </FadeIn>
        </View>

        {/* Disclaimer */}
        <FadeIn index={13}>
          <LinearGradient
            colors={['#FFF8E1', '#FFF3CD'] as const}
            style={styles.disclaimerBox}
          >
            <Text style={styles.disclaimerText}>
              ⚠️ Abhi yeh app mock data use karta hai. Real-time prices aur delivery times future update mein aayenge. Platform pe jaake verify karna! 🙏
            </Text>
          </LinearGradient>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: Spacing['5xl'] },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.title1,
    fontWeight: '900',
  },
  subtitle: {
    ...Typography.callout,
    marginTop: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing['2xl'],
  },
  sectionLabel: {
    ...Typography.overline,
    marginBottom: Spacing.md,
  },
  stepCard: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  stepLeft: {
    alignItems: 'center',
    width: 44,
  },
  stepEmojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  stepEmoji: {
    fontSize: 22,
  },
  stepLine: {
    flex: 1,
    width: 2,
    marginTop: Spacing.sm,
    marginBottom: -Spacing.md,
    borderRadius: 1,
  },
  stepContent: {
    flex: 1,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  stepHeading: {
    ...Typography.headline,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  stepBody: {
    ...Typography.subheadline,
  },
  modeCard: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
  modeName: {
    ...Typography.headline,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  modeDesc: {
    ...Typography.subheadline,
  },
  platformRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  platformName: {
    ...Typography.footnote,
    fontWeight: '700',
  },
  disclaimerBox: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing['3xl'],
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  disclaimerText: {
    ...Typography.footnote,
    color: '#6D5000',
  },
});
