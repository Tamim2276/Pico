import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@shared/constants/data";

interface Props {
  navigation: any;
}

// Feature definitions (matches web splash screen)
const FEATURES = [
  { emoji: "🎯", text: "Smart Task Management" },
  { emoji: "🗓️", text: "AI-Powered Scheduling" },
  { emoji: "🔔", text: "Intelligent Reminders" },
];

export default function SplashScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Status bar: light content for dark background */}
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Decorative glow circles (simulates web blur effect) */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      {/* Scrollable content container */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: logo, app name, tagline */}
        <View style={styles.topSection}>
          {/* Icon circle with glow effect */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✦</Text>
          </View>

          <Text style={styles.appName}>Pico</Text>
          <Text style={styles.tagline}>Your Private AI Assistant</Text>
        </View>

        {/* Features section: three feature pills */}
        <View style={styles.featuresSection}>
          {FEATURES.map((feature) => (
            <View key={feature.text} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{feature.emoji}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
              <View style={styles.featureDot} />
            </View>
          ))}
        </View>

        {/* Actions: get started button, login link, version */}
        <View style={styles.bottomSection}>
          {/* Get started button (navigates to SignUp) */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.getStartedButton}
            onPress={() => navigation.navigate("SignUp")}
          >
            <Text style={styles.getStartedText}>Get Started →</Text>
          </TouchableOpacity>

          {/* Login link (navigates to Login) */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>

          {/* App version */}
          <Text style={styles.version}>v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },

  glowTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(108, 107, 200, 0.2)",
  },

  glowBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(38, 34, 119, 0.3)",
  },

  topSection: {
    alignItems: "center",
    marginBottom: 8,
  },

  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4B49A0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C6BC8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 16,
  },

  iconText: {
    fontSize: 44,
    color: COLORS.surface,
  },

  appName: {
    fontSize: 38,
    fontWeight: "bold",
    color: COLORS.surface,
    marginTop: 4,
  },

  tagline: {
    fontSize: 15,
    color: "#A8C4E0",
    marginTop: 8,
    opacity: 0.9,
  },

  featuresSection: {
    gap: 12,
    marginVertical: 16,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  featureEmoji: {
    fontSize: 20,
    marginRight: 12,
  },

  featureText: {
    flex: 1,
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },

  featureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },

  bottomSection: {
    alignItems: "center",
    gap: 16,
  },

  getStartedButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    height: 52,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  getStartedText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
  },

  loginRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  loginText: {
    color: COLORS.surface,
    fontSize: 14,
  },

  loginLink: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },

  version: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
});