import { ScalePressable } from '@/components/ui/animated-pressable';
import { Brand, Radii, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-color';
import { DecisionMode } from '@/types/meal';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const MODE_OPTIONS: { mode: DecisionMode; label: string; icon: string }[] = [
  { mode: 'balanced', label: 'Best Deal', icon: '🤝' },
  { mode: 'cheapest', label: 'Sasta', icon: '💰' },
  { mode: 'fastest', label: 'Fast', icon: '⚡' },
  { mode: 'bestRated', label: 'Top Rated', icon: '⭐' },
];

interface DecisionModePickerProps {
  value: DecisionMode;
  onChange: (mode: DecisionMode) => void;
}

export function DecisionModePicker({ value, onChange }: DecisionModePickerProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {MODE_OPTIONS.map(({ mode, label, icon }) => {
        const isActive = value === mode;
        return (
          <ScalePressable
            key={mode}
            onPress={() => {
              if (process.env.EXPO_OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              onChange(mode);
            }}
            scaleDown={0.93}
          >
            {isActive ? (
              <LinearGradient
                colors={Brand.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pill}
              >
                <Text style={styles.icon}>{icon}</Text>
                <Text style={styles.labelActive}>{label}</Text>
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.pill,
                  { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
                ]}
              >
                <Text style={styles.icon}>{icon}</Text>
                <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
              </View>
            )}
          </ScalePressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radii.full,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
