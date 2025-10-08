import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface TypingIndicatorProps {
  visible: boolean;
}

/**
 * Typing indicator component with animated dots
 * Shows 3 bouncing dots in sequence
 * Uses assistant message bubble styling
 */
export function TypingIndicator({ visible }: TypingIndicatorProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <View style={styles.dotsContainer}>
          <AnimatedDot delay={0} />
          <AnimatedDot delay={200} />
          <AnimatedDot delay={400} />
        </View>
      </View>
    </View>
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.0, { duration: 400 }),
          withTiming(0.8, { duration: 400 })
        ),
        -1, // Infinite repeat
        false
      )
    );
  }, [delay, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
});
