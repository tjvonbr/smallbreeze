import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';

interface SwipeActionProps {
  progress: SharedValue<number>;
  /** Horizontal offset the action starts at while the row is closed. */
  from: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function SwipeAction({ progress, from, style, children }: SwipeActionProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [from, 0]) }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
