import React, { useEffect, useMemo, useRef } from "react";
import { Dimensions, StyleSheet } from "react-native";
import { Canvas, Circle } from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const COLORS = ["#8B5CF6", "#3B82F6", "#EC4899"];
const PARTICLE_COUNT = 40;

/**
 * Generates a random number between min and max
 */
function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function MeshBackground() {
  /**
   * Global simulation time (in seconds)
   * This grows forever → NO RESET EVER
   */
  const time = useSharedValue(0);

  /**
   * Stores last frame timestamp for delta calculation
   */
  const lastTime = useSharedValue(Date.now());

  /**
   * Prevents double animation loop in React StrictMode (dev only issue)
   */
  const started = useRef(false);

  /**
   * Start real-time simulation loop
   */
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let frameId: number;

    const update = () => {
      const now = Date.now();

      // delta time in seconds
      const dt = (now - lastTime.value) / 1000;
      lastTime.value = now;

      // accumulate infinite time
      time.value += dt;

      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frameId);
  }, []);

  /**
   * Particle definitions (static forever)
   */
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map(() => {
      const size = random(40, 90);

      return {
        cx: random(0, width),
        cy: random(0, height),

        baseR: size / 2,

        color: COLORS[Math.floor(Math.random() * COLORS.length)],

        phaseX: random(0, Math.PI * 2),
        phaseY: random(0, Math.PI * 2),

        driftX: random(40, 120),
        driftY: random(40, 120),

        speed: random(0.6, 1.6),
      };
    });
  }, []);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, index) => {
        /**
         * X movement (organic flow)
         */
        const cx = useDerivedValue(() => {
          const t = time.value * p.speed;

          return (
            p.cx +
            Math.sin(t + p.phaseX) * p.driftX
          );
        });

        /**
         * Y movement (slightly different frequency = natural motion)
         */
        const cy = useDerivedValue(() => {
          const t = time.value * p.speed;

          return (
            p.cy +
            Math.cos(t + p.phaseY) * p.driftY
          );
        });

        /**
         * Opacity breathing (replaces blur softness)
         */
        const opacity = useDerivedValue(() => {
          const t = time.value * p.speed;

          return 0.15 + Math.sin(t + p.phaseX) * 0.12;
        });

        /**
         * Radius breathing (gives "alive" feeling)
         */
        const radius = useDerivedValue(() => {
          const t = time.value * p.speed;

          return p.baseR + Math.sin(t + p.phaseY) * 2.5;
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