import { ScalePressable } from '@/components/ui/animated-pressable';
import { Brand, Radii, Shadows, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-color';
import React, { useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput
} from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface FoodSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}

export function FoodSearchBar({ value, onChangeText, onSubmit }: FoodSearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useSharedValue(0);
  const colors = useThemeColors();

  const containerAnimStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      [colors.border, Brand.primary],
    ),
    transform: [{ scale: 1 + focusAnim.value * 0.005 }],
  }));

  function handleFocus() {
    setIsFocused(true);
    focusAnim.value = withSpring(1, { damping: 20, stiffness: 300 });
  }

  function handleBlur() {
    setIsFocused(false);
    focusAnim.value = withSpring(0, { damping: 20, stiffness: 300 });
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.card },
        containerAnimStyle,
      ]}
    >
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Kya khaoge aaj? 🍛"
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {value.length > 0 && (
        <ScalePressable onPress={onSubmit} style={styles.goButton} scaleDown={0.9}>
          <Text style={styles.goText}>Go</Text>
        </ScalePressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Brand.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginHorizontal: Spacing.xl,
    ...Shadows.md,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
  goButton: {
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    marginLeft: Spacing.sm,
  },
  goText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
