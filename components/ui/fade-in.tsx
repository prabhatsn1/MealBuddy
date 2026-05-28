import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  direction?: 'up' | 'down';
  style?: StyleProp<ViewStyle>;
}

export function FadeIn({ children, index = 0, delay = 60, direction = 'up', style }: Props) {
  const entering = direction === 'up'
    ? FadeInDown.delay(index * delay).duration(400).springify()
    : FadeInUp.delay(index * delay).duration(400).springify();

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
