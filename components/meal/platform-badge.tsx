import { Brand, Radii, Spacing } from '@/constants/theme';
import { Platform } from '@/types/meal';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PlatformBadgeProps {
  platform: Platform;
  size?: 'sm' | 'md';
}

const PLATFORM_COLORS: Record<Platform, string> = {
  Swiggy: Brand.swiggy,
  Zomato: Brand.zomato,
  'Uber Eats': Brand.uberEats,
};

export function PlatformBadge({ platform, size = 'md' }: PlatformBadgeProps) {
  const color = PLATFORM_COLORS[platform];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + '15', borderColor: color + '40' },
        isSmall && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }, isSmall && styles.dotSm]} />
      <Text style={[styles.label, { color }, isSmall && styles.labelSm]}>{platform}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotSm: {
    width: 5,
    height: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
});
