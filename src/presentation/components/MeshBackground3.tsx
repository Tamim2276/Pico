import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Canvas, Circle, Group, Blur } from '@shopify/react-native-skia';
import { 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing, 
  useDerivedValue 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const COLORS = ["#8B5CF6", "#3B82F6", "#EC4899"];
const PARTICLE_COUNT = 20; // Lower count with larger sizes blends cleaner!

// Establish a central anchor point for the cluster group
const CENTER_X = width / 2;
const CENTER_Y = height / 2;

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function MeshBackground() {
  // Clock for the drifting/morphing fluid motion
  const clock = useSharedValue(0);
  
  // Clock for the rhythmic blinking/blurring pulse
  const blink = useSharedValue(0);

  useEffect(() => {
    // Continuous loop for floating motion
    clock.value = withRepeat(
      withTiming(1, { 
        duration: 30000, 
        easing: Easing.linear 
      }),
      -1,
      false
    );

    // Dynamic pacing for the blinking blur effect (oscillates back and forth)
    blink.value = withRepeat(
      withTiming(1, {
        duration: 6000, // 6 seconds per complete blink cycle
        easing: Easing.inOut(Easing.ease)
      }),
      -1,
      true // Setting this to true makes it reverse (0 -> 1 -> 0) naturally
    );
  }, []);

  // Generate metadata clustered around the core screen center
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map(() => {
      // Larger circle elements bleed together much more convincingly
      const size = random(120, 260); 
      return {
        cx: random(CENTER_X - 80, CENTER_X + 80), // Kept tight in the center matrix
        cy: random(CENTER_Y - 100, CENTER_Y + 100),
        r: size / 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        phaseX: random(0, Math.PI * 2),
        phaseY: random(0, Math.PI * 2),
        driftX: random(80, 160),
        driftY: random(100, 200),
      };
    });
  }, []);

  // Dynamically derive the collective blur factor from our blinking timeline
  const blurSigma = useDerivedValue(() => {
    // Scales dynamically between a clear, distinct blend (sigma 30) 
    // and a completely ambient blurred state (sigma 90)
    return 30 + (blink.value * 60);
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 
        By nesting the Blur image filter inside this Group, Skia applies the effect 
        to the entire layer of elements collectively. As individual circles overlap, 
        the heavy blur binds them together into a singular fluid entity.
      */}
      <Group>
        <Blur blur={blurSigma} mode="clamp" />
        
        {particles.map((p, index) => {
          const cx = useDerivedValue(() => {
            return p.cx + Math.sin(clock.value * Math.PI * 2 + p.phaseX) * p.driftX;
          });

          const cy = useDerivedValue(() => {
            return p.cy + Math.cos(clock.value * Math.PI * 2 + p.phaseY) * p.driftY;
          });

          const opacity = useDerivedValue(() => {
            // High base opacity gives the blurred mesh strong color presence
            return 0.4 + Math.sin(clock.value * Math.PI * 2 + p.phaseX) * 0.15;
          });

          return (
            <Circle
              key={index}
              cx={cx}
              cy={cy}
              r={p.r}
              color={p.color}
              opacity={opacity}
            />
          );
        })}
      </Group>
    </Canvas>
  );
}