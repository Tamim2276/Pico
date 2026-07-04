import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { BlurMask, Canvas, Circle } from '@shopify/react-native-skia';
import { 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing, 
  useDerivedValue 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const COLORS = ["#8B5CF6", "#3B82F6", "#EC4899"];
const PARTICLE_COUNT = 60;

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function MeshBackground() {
  // Replace useLoop with a Reanimated shared value running from 0 to 1
  const clock = useSharedValue(0);

  useEffect(() => {
    clock.value = withRepeat(
      withTiming(1, { 
        duration: 25000, 
        easing: Easing.linear 
      }),
      -1, // Loop indefinitely
      false // Reset back to 0 instead of reversing
    );
  }, []);

  // Generate all immutable particle metadata once
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map(() => {
      const size = random(30, 70);
      return {
        cx: random(0, width),
        cy: random(0, height),
        r: size / 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        phaseX: random(0, Math.PI * 2),
        phaseY: random(0, Math.PI * 2),
        driftX: random(40, 100),
        driftY: random(60, 120),
      };
    });
  }, []);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, index) => {
        // Modern approach: useDerivedValue listens to the Reanimated clock 
        // and updates the Skia graphics canvas directly on the UI thread.
        const cx = useDerivedValue(() => {
          return p.cx + Math.sin(clock.value * Math.PI * 2 + p.phaseX) * p.driftX;
        });

        const cy = useDerivedValue(() => {
          return p.cy + Math.cos(clock.value * Math.PI * 2 + p.phaseY) * p.driftY;
        });

        const opacity = useDerivedValue(() => {
          return 0.2 + Math.sin(clock.value * Math.PI * 2 + p.phaseX) * 0.1;
        });

        return (
          <Circle
            key={index}
            cx={cx}
            cy={cy}
            r={p.r}
            color={p.color}
            opacity={opacity}
          >
            {/* <BlurMask blur={3}/> */}
          </Circle>
        );
      })}
    </Canvas>
  );
}