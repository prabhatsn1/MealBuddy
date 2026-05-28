import { Brand, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { meetsThreshold } from '@/lib/confidence';
import { cancelOrderReminder, getReminderLabel, scheduleOrderReminder } from '@/lib/notifications/order-reminder';
import { Confidence, RestaurantResult, Warning } from '@/types/meal';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PlatformBadge } from './platform-badge';

interface BestChoiceBannerProps {
  winner: RestaurantResult;
  explanation: string;
  confidence: Confidence;
  tradeOff?: string | null;
  warnings?: Warning[];
  food?: string;
  /** Minimum confidence level required to show the one-tap handoff button. */
  minConfidenceToAct?: Confidence;
  /** Auto-arm the handoff button when winner.price is at or below this value (0 = off). */
  autoOrderThreshold?: number;
  /** When true, shows a reminder to select Cash on Delivery on the platform. */
  preferCOD?: boolean;
}

const CONFIDENCE_CONFIG: Record<Confidence, { icon: string; label: string; color: string; bg: string }> = {
  high:   { icon: '✅', label: 'High confidence',   color: '#15803D', bg: '#DCFCE7' },
  medium: { icon: '⚠️', label: 'Medium confidence', color: '#92400E', bg: '#FEF3C7' },
  low:    { icon: '❓', label: 'Low confidence',    color: '#6B21A8', bg: '#F3E8FF' },
};

const WARNING_COLORS: Record<Warning['type'], { bg: string; text: string; border: string }> = {
  price_surge:   { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  low_rating:    { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  slow_delivery: { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' },
};

function buildDeepLinkUrl(platform: string, restaurantName: string): string {
  const q = encodeURIComponent(restaurantName);
  switch (platform) {
    case 'Swiggy':    return `https://www.swiggy.com/search?query=${q}`;
    case 'Zomato':    return `https://www.zomato.com/search?q=${q}`;
    case 'Uber Eats': return `https://www.ubereats.com/search?q=${q}`;
    default:          return '';
  }
}

export function BestChoiceBanner({
  winner,
  explanation,
  confidence,
  tradeOff,
  warnings = [],
  food = 'food',
  minConfidenceToAct = 'medium',
  autoOrderThreshold = 0,
  preferCOD = false,
}: BestChoiceBannerProps) {
  const conf = CONFIDENCE_CONFIG[confidence];
  const deepLink = buildDeepLinkUrl(winner.platform, winner.name);
  const canAct = meetsThreshold(confidence, minConfidenceToAct);
  const autoArmed =
    autoOrderThreshold > 0 &&
    winner.price <= autoOrderThreshold &&
    canAct;

  // "Ready to Order?" CTA state — pre-armed when auto-order threshold is met
  const [isReady, setIsReady] = useState(autoArmed);

  // Re-evaluate if props change (e.g. threshold updated while screen open)
  useEffect(() => {
    if (autoArmed) setIsReady(true);
  }, [autoArmed]);

  // Notification reminder state
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [reminderLabel, setReminderLabel] = useState<string>('');

  const handleReminder = async () => {
    if (reminderId) {
      await cancelOrderReminder(reminderId);
      setReminderId(null);
      setReminderLabel('');
      return;
    }
    const id = await scheduleOrderReminder(food, winner.name, winner.platform);
    if (id) {
      setReminderId(id);
      setReminderLabel(getReminderLabel());
    }
  };

  const handleReadyToOrder = () => {
    if (isReady && deepLink) {
      Linking.openURL(deepLink);
    } else {
      setIsReady(true);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(500).springify()}
      style={styles.banner}
    >
      {/* ── Smart warnings (above card) ── */}
      {warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          {warnings.map((w) => {
            const wc = WARNING_COLORS[w.type];
            return (
              <View
                key={w.type}
                style={[styles.warningRow, { backgroundColor: wc.bg, borderColor: wc.border }]}
              >
                <Text style={styles.warningIcon}>{w.icon}</Text>
                <Text style={[styles.warningText, { color: wc.text }]}>{w.message}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Order preview header ── */}
      <Text style={styles.previewLabel}>🤖 This is what I'd order for you</Text>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Best pick for you!</Text>
        {/* Confidence badge */}
        <View style={[styles.confidenceBadge, { backgroundColor: conf.bg }]}>
          <Text style={styles.confidenceIcon}>{conf.icon}</Text>
          <Text style={[styles.confidenceLabel, { color: conf.color }]}>{conf.label}</Text>
        </View>
      </View>

      <LinearGradient
        colors={['#EEF2FF', '#E0E7FF'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.restaurantName}>{winner.name}</Text>
            <PlatformBadge platform={winner.platform} />
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>₹{winner.price}</Text>
            {winner.originalPrice > winner.price && (
              <Text style={styles.originalPrice}>₹{winner.originalPrice}</Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatPill icon="⭐" value={String(winner.rating)} />
          <StatPill icon="⏱️" value={`${winner.deliveryMinutes} min`} />
          <StatPill icon="📍" value={winner.distance} />
        </View>

        {/* ── Trade-off pill ── */}
        {tradeOff ? (
          <View style={styles.tradeOffPill}>
            <Text style={styles.tradeOffText}>💡 {tradeOff}</Text>
          </View>
        ) : null}

        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>

        {/* ── Ready to Order CTA (one-tap handoff) ── */}
        {deepLink && canAct ? (
          <>
            {autoArmed && !isReady === false && (
              <View style={styles.autoOrderBadge}>
                <Text style={styles.autoOrderBadgeText}>
                  🤖 Auto-armed · ₹{winner.price} is under your ₹{autoOrderThreshold} limit
                </Text>
              </View>
            )}
            {/* COD reminder — shown when the user prefers cash on delivery */}
            {preferCOD && isReady && (
              <View style={styles.codReminderRow}>
                <Text style={styles.codReminderText}>
                  💵 Remember to select Cash on Delivery on {winner.platform}
                </Text>
              </View>
            )}
            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={[styles.readyButton, isReady && styles.readyButtonActive, { flex: 1 }]}
                onPress={handleReadyToOrder}
                activeOpacity={0.8}
              >
                <Text style={styles.readyButtonText}>
                  {isReady ? `✅ Open ${winner.platform} now →` : '🛒 Ready to Order?'}
                </Text>
              </TouchableOpacity>
              {/* Emergency stop — un-arms the order in one tap */}
              {isReady && (
                <TouchableOpacity
                  style={styles.undoButton}
                  onPress={() => setIsReady(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.undoButtonText}>✕ Undo</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : deepLink && !canAct ? (
          <View style={styles.confidenceBlockedRow}>
            <Text style={styles.confidenceBlockedText}>
              🔒 Confidence too low to act — raise your threshold in Settings to enable one-tap ordering
            </Text>
          </View>
        ) : null}

        {/* ── Optional notification reminder ── */}
        <TouchableOpacity
          style={styles.reminderButton}
          onPress={handleReminder}
          activeOpacity={0.8}
        >
          <Text style={styles.reminderButtonText}>
            {reminderId
              ? `✅ Reminder set — ${reminderLabel}`
              : '🔔 Remind me later'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

function StatPill({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  // ── Warnings ──────────────────────────────────────────────────────────────
  warningsContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  warningRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  warningIcon: {
    fontSize: 14,
  },
  warningText: {
    ...Typography.footnote,
    fontWeight: '600' as const,
    flex: 1,
  },
  // ── Header ────────────────────────────────────────────────────────────────
  previewLabel: {
    ...Typography.caption1,
    color: Brand.primary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  heading: {
    ...Typography.title2,
    color: Brand.primary,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  confidenceIcon: {
    fontSize: 12,
  },
  confidenceLabel: {
    ...Typography.caption2,
    fontWeight: '700',
  },
  card: {
    borderRadius: Radii.xl,
    padding: 18,
    borderWidth: 2,
    borderColor: Brand.primary,
    gap: Spacing.lg,
    ...Shadows.glow(Brand.primary),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  info: {
    flex: 1,
    gap: Spacing.sm,
  },
  restaurantName: {
    ...Typography.title3,
    fontWeight: '800',
    color: '#111827',
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 26,
    fontWeight: '900',
    color: Brand.primary,
  },
  originalPrice: {
    ...Typography.footnote,
    color: Brand.textMuted,
    textDecorationLine: 'line-through',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  statIcon: {
    fontSize: 13,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  explanationBox: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  explanationText: {
    ...Typography.subheadline,
    color: '#374151',
    fontStyle: 'italic',
  },
  // ── Trade-off ─────────────────────────────────────────────────────────────
  tradeOffPill: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start' as const,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  tradeOffText: {
    ...Typography.caption1,
    color: '#4B5563',
    fontWeight: '600' as const,
  },
  // ── CTAs ──────────────────────────────────────────────────────────────────
  readyButton: {
    backgroundColor: Brand.primary,
    borderRadius: Radii.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center' as const,
  },
  readyButtonActive: {
    backgroundColor: '#15803D',
  },
  readyButtonText: {
    ...Typography.callout,
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  // CTA row (open + undo side by side)
  ctaRow: {
    flexDirection: 'row' as const,
    gap: Spacing.sm,
    alignItems: 'stretch' as const,
  },
  undoButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: Radii.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  undoButtonText: {
    ...Typography.footnote,
    color: '#EF4444',
    fontWeight: '700' as const,
  },
  // COD reminder
  codReminderRow: {
    backgroundColor: '#FFFBEB',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  codReminderText: {
    ...Typography.caption1,
    color: '#92400E',
    fontWeight: '600' as const,
  },
  reminderButton: {
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: Brand.primary,
  },
  reminderButtonText: {
    ...Typography.footnote,
    color: Brand.primary,
    fontWeight: '600' as const,
  },
  // ── Auto-order / confidence gate ─────────────────────────────────────────
  autoOrderBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  autoOrderBadgeText: {
    ...Typography.caption1,
    color: '#15803D',
    fontWeight: '600' as const,
  },
  confidenceBlockedRow: {
    backgroundColor: '#F3F4F6',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  confidenceBlockedText: {
    ...Typography.caption1,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
});
