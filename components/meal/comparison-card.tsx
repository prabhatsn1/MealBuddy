import { Brand, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-color';
import { ScoredResult } from '@/types/meal';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PlatformBadge } from './platform-badge';

interface ComparisonCardProps {
  result: ScoredResult;
  isWinner?: boolean;
  rank: number;
}

function buildDeepLinkUrl(platform: string, restaurantName: string): string {
  const q = encodeURIComponent(restaurantName);
  switch (platform) {
    case 'Swiggy':    return `https://www.swiggy.com/search?query=${q}`;
    case 'Zomato':    return `https://www.zomato.com/search?q=${q}`;
    case 'Uber Eats': return `https://www.ubereats.com/search?q=${q}`;
    default:          return '';
  }
}

export function ComparisonCard({ result, isWinner = false, rank }: ComparisonCardProps) {
  const hasDiscount = result.originalPrice > result.price;
  const colors = useThemeColors();

  return (
    <Animated.View
      entering={FadeInDown.delay(rank * 80).duration(400).springify()}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isWinner && styles.cardWinner,
      ]}
    >
      {isWinner && (
        <LinearGradient
          colors={Brand.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.winnerRibbon}
        >
          <Text style={styles.winnerRibbonText}>BEST PICK ✅</Text>
        </LinearGradient>
      )}

      <View style={styles.row}>
        <View style={[styles.rankBubble, isWinner && styles.rankBubbleWinner]}>
          <Text style={[styles.rankText, { color: colors.textSecondary }, isWinner && styles.rankTextWinner]}>
            #{rank}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {result.name}
          </Text>
          <PlatformBadge platform={result.platform} size="sm" />
        </View>

        <View style={styles.priceBlock}>
          <Text style={[styles.price, { color: colors.text }]}>₹{result.price}</Text>
          {hasDiscount && (
            <Text style={styles.originalPrice}>₹{result.originalPrice}</Text>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat icon="⭐" value={String(result.rating)} colors={colors} />
        <Stat icon="⏱️" value={`${result.deliveryMinutes} min`} colors={colors} />
        <Stat icon="📍" value={result.distance} colors={colors} />
        {result.offer && <Stat icon="🎁" value={result.offer} highlight colors={colors} />}
      </View>

      {/* ── Deep link ── */}
      <TouchableOpacity
        style={styles.openButton}
        onPress={() => {
          const url = buildDeepLinkUrl(result.platform, result.name);
          if (url) Linking.openURL(url);
        }}
        activeOpacity={0.75}
      >
        <Text style={styles.openButtonText}>Open in {result.platform} →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function Stat({
  icon,
  value,
  highlight = false,
  colors,
}: {
  icon: string;
  value: string;
  highlight?: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.separator }, highlight && styles.statHighlight]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text
        style={[styles.statText, { color: colors.textSecondary }, highlight && styles.statTextHighlight]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    ...Shadows.md,
  },
  cardWinner: {
    borderColor: Brand.primary,
    borderWidth: 2,
    ...Shadows.glow(Brand.primary),
  },
  winnerRibbon: {
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  winnerRibbonText: {
    color: '#FFFFFF',
    ...Typography.caption2,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  rankBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Brand.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBubbleWinner: {
    backgroundColor: Brand.primary,
  },
  rankText: {
    ...Typography.footnote,
    fontWeight: '700',
  },
  rankTextWinner: {
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    gap: Spacing.xs + 1,
  },
  name: {
    ...Typography.headline,
    fontWeight: '700',
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
  },
  originalPrice: {
    ...Typography.caption1,
    color: Brand.textMuted,
    textDecorationLine: 'line-through',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  statHighlight: {
    backgroundColor: '#FFF3CD',
  },
  statIcon: {
    fontSize: 11,
  },
  statText: {
    ...Typography.caption1,
    fontWeight: '500',
  },
  statTextHighlight: {
    color: '#856404',
    fontWeight: '600',
  },
  openButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Brand.primaryLight,
    alignSelf: 'flex-start',
  },
  openButtonText: {
    ...Typography.caption1,
    color: Brand.primary,
    fontWeight: '700',
  },
});
