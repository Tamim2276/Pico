import React, { useEffect, useState, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const COLORS = ["#8B5CF6", "#3B82F6", "#EC4899"];
const PARTICLE_COUNT = 15;

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function FloatingParticle() {
  // Fix 1: Freeze the random layout properties so they don't regenerate on re-render
  const config = useMemo(() => {
    const size = random(15, 60);
    return {
      startX: random(0, width),
      startY: random(0, height),
      size,
      borderRadius: size / 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  }, []);

  // Initialize shared values with the locked initial positions
  const translateX = useSharedValue(config.startX);
  const translateY = useSharedValue(config.startY);
  const opacity = useSharedValue(random(0.15, 0.45));
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(config.startX + random(-60, 60), {
        duration: random(18000, 30000),
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    translateY.value = withRepeat(
      withTiming(config.startY + random(-60, 60), {
        duration: random(22000, 35000),
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    opacity.value = withRepeat(
      withTiming(random(0.1, 0.5), {
        duration: random(3000, 6000),
      }),
      -1,
      true
    );

    scale.value = withRepeat(
      withTiming(random(0.8, 1.3), {
        duration: random(5000, 9000),
      }),
      -1,
      true
    );
  }, [config]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.borderRadius,
          backgroundColor: config.color,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function MeshBackground() {
  // Fix 3: Create an array of stable IDs instead of mapping index
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => `particle-${i}`);
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((id) => (
        <FloatingParticle key={id} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    // Fix 2: Explicitly baseline the layout grid so translation offsets map accurately
    top: 0,
    left: 0,
    
    // iOS Glow
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    
    // Android Shadow (Warning: Will render as boxy shadow, remove if it looks ugly)
    elevation: 8, 
  },
});