import React, { useMemo } from "react";
import { Dimensions, StyleSheet } from "react-native";
import { Canvas, Circle } from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const COLORS = ["#8B5CF6", "#3B82F6", "#EC4899"];
const PARTICLE_COUNT = 40;

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function MeshBackground() {
  // 1. A clean shared value to hold the total elapsed simulation time
  const time = useSharedValue(0);

  // 2. High-performance UI thread frame loop wrapper
  useFrameCallback((frameInfo) => {
    // timeSincePreviousFrame is provided natively in milliseconds
    if (frameInfo.timeSincePreviousFrame) {
      time.value += frameInfo.timeSincePreviousFrame / 1000;
    }
  }, true); // Setting to 'true' starts the frame engine immediately

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map(() => {
      const size = random(40, 90); // Slightly larger particles make the background look softer
      return {
        cx: random(0, width),
        cy: random(0, height),
        baseR: size / 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        phaseX: random(0, Math.PI * 2),
        phaseY: random(0, Math.PI * 2),
        driftX: random(50, 120),
        driftY: random(50, 120),
        speed: random(0.2, 0.3), // Slower speed creates a much more natural fluid drift
      };
    });
  }, []);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, index) => {
        // X Position Loop
        const cx = useDerivedValue(() => {
          const t = time.value * p.speed;
          return p.cx + Math.sin(t + p.phaseX) * p.driftX;
        });

        // Y Position Loop
        const cy = useDerivedValue(() => {
          const t = time.value * p.speed;
          return p.cy + Math.cos(t + p.phaseY) * p.driftY;
        });

        // Opacity Breath Loop
        const opacity = useDerivedValue(() => {
          const t = time.value;
          const global = 0.5 + 0.5 * Math.sin(t * 0.3);
          const local = 0.5 + 0.5 * Math.sin(t * p.speed + p.phaseX * 2.0);
          
          // Amplified the minimum value slightly so the bubbles don't disappear completely
          return 0.12 + global * local * .2;
        });

        // Radius Breath Loop
        const radius = useDerivedValue(() => {
          const t = time.value * p.speed;
          return p.baseR + Math.sin(t + p.phaseY) * 4;
        });

        return (
          <Circle
            key={index}
            cx={cx}
            cy={cy}
            r={radius}
            color={p.color}
            opacity={opacity}
          />
        );
      })}
    </Canvas>
  );
}

const styles = StyleSheet.create({});