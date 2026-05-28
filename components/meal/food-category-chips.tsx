import { ScalePressable } from '@/components/ui/animated-pressable';
import { Brand, Radii, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const CATEGORIES = [
  { label: 'Biryani', emoji: '🍛' },
  { label: 'Pizza', emoji: '🍕' },
  { label: 'Burger', emoji: '🍔' },
  { label: 'Dosa', emoji: '🫓' },
  { label: 'Rolls', emoji: '🌯' },
];

// Mood shortcuts map to actual food queries
const MOODS: { label: string; emoji: string; query: string }[] = [
  { label: 'Light',        emoji: '🥗', query: 'salad'    },
  { label: 'Comfort',      emoji: '🍱', query: 'biryani'  },
  { label: 'Quick Bite',   emoji: '⚡', query: 'sandwich' },
  { label: 'Treat',        emoji: '🍰', query: 'dessert'  },
];

interface FoodCategoryChipsProps {
  selectedFood: string;
  onSelect: (food: string) => void;
}

export function FoodCategoryChips({ selectedFood, onSelect }: FoodCategoryChipsProps) {
  const colors = useThemeColors();

  function tap(query: string) {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(query);
  }

  return (
    <View style={styles.wrapper}>
      {/* ── Food categories ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CATEGORIES.map(({ label, emoji }) => {
          const isActive = selectedFood.toLowerCase() === label.toLowerCase();
          return (
            <ScalePressable
              key={label}
              onPress={() => tap(label)}
              style={[
                styles.chip,
                { backgroundColor: colors.card, borderColor: colors.border },
                isActive && styles.chipActive,
              ]}
              scaleDown={0.93}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              <Text style={[styles.label, { color: colors.text }, isActive && styles.labelActive]}>
                {label}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>

      {/* ── Mood shortcuts ── */}
      <Text style={[styles.moodHeading, { color: colors.textSecondary }]}>Mood?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {MOODS.map(({ label, emoji, query }) => {
          const isActive = selectedFood.toLowerCase() === query.toLowerCase();
          return (
            <ScalePressable
              key={label}
              onPress={() => tap(query)}
              style={[
                styles.moodChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                isActive && styles.moodChipActive,
              ]}
              scaleDown={0.93}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              <Text style={[styles.label, { color: colors.text }, isActive && styles.labelActive]}>
                {label}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  moodHeading: {
    ...Typography.caption1,
    fontWeight: '600',
    marginLeft: Spacing.xl,
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radii.full,
    borderWidth: 1.5,
  },
  chipActive: {
    backgroundColor: Brand.primaryLight,
    borderColor: Brand.primary,
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: Brand.primary,
    fontWeight: '700',
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  moodChipActive: {
    backgroundColor: Brand.primaryLight,
    borderColor: Brand.primary,
    borderStyle: 'solid',
  },
});
