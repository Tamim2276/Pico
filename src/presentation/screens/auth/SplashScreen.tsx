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

const FEATURES = [
  { emoji: "🎯", text: "Smart Task Management" },
  { emoji: "🗓️", text: "AI-Powered Scheduling" },
  { emoji: "🔔", text: "Intelligent Reminders" },
];

// ─── Component
export default function SplashScreen({ navigation }: Props) {
  return (
    // In web this was just a <div> with min-h-full
    <SafeAreaView style={styles.container}>
      {/* StatusBar: web had <meta name="theme-color" content="#2A2870"> */}
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primaryDark}
      />

      {/* Glow circles web used CSS blur filter, RN cannot blur Views */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      {/* ScrollView replaces web's flex flex-col justify-between */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP SECTION: Logo, App Name, Tagline */}
        <View style={styles.topSection}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✦</Text>
          </View>

          {/* App name same as web <h1> */}
          <Text style={styles.appName}>Pico</Text>

          {/* Tagline  same as web <p className="text-[#A8C4E0]"> */}
          <Text style={styles.tagline}>Your Private AI Assistant</Text>
        </View>

        {/* MIDDLE SECTION: Features */}
        <View style={styles.featuresSection}>
          {FEATURES.map((feature) => (
            <View key={feature.text} style={styles.featureRow}>
              {/* Emoji icon same as web <span className="text-lg"> */}
              <Text style={styles.featureEmoji}>{feature.emoji}</Text>

              {/* Feature label same as web <span className="text-white text-[14px] font-bold"> */}
              <Text style={styles.featureText}>{feature.text}</Text>

              {/* Teal dot web used animate-pulse with Tailwind
                  RN: static dot*/}
              <View style={styles.featureDot} />
            </View>
          ))}
        </View>

        {/* BOTTOM SECTION: Get Started button, Login link, Version label */}
        <View style={styles.bottomSection}>
          {/* Primary CTA button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.getStartedButton}
            onPress={() => navigation.replace("SignUp")}
          >
            <Text style={styles.getStartedText}>Get Started →</Text>
          </TouchableOpacity>

          {/* Login link row
              Web: <p> with inline <button> child
              RN: <View flexDirection row> with two <Text> children */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.replace("Login")}
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>

          {/* Version label
              Web: <span className="text-white/40 text-[10px] tracking-widest uppercase">
              RN: <Text style={styles.version}> with letterSpacing */}
          <Text style={styles.version}>v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  //Container
  // Full screen container with background color
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark, // '#2A2870'
  },

  // ScrollView content container
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },

  //Background glow circles
  glowTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(108, 107, 200, 0.2)", // '#6C6BC8' at 20% opacity
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(38, 34, 119, 0.3)", // '#262277' at 30% opacity
  },

  // Top Section
  topSection: {
    alignItems: "center", // centers children horizontally (like text-center + flex items-center)
    marginBottom: 8,
  },

  //the common UI pattern of wrapping an icon inside a circular background or border
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50, // half of width/height = perfect circle
    backgroundColor: "#4B49A0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C6BC8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 12, // Android shadow
    marginBottom: 16,
  },

  // character substituting the Compass icon from lucide-react
  iconText: {
    fontSize: 44,
    color: COLORS.surface, // white
  },

  // "Pico"
  appName: {
    fontSize: 38,
    fontWeight: "bold",
    color: COLORS.surface,
    marginTop: 4,
  },

  // Tagline
  tagline: {
    fontSize: 15,
    color: "#A8C4E0",
    marginTop: 8,
    opacity: 0.9,
  },

  //Feature Pills
  featuresSection: {
    gap: 12, // gap between each featureRow (React Native supports gap from RN 0.71+)
    marginVertical: 16,
  },

  //it is a horizontal pill-like container with an emoji, text, and
  // a dot at the end. It uses flexDirection: "row" to lay out its children horizontally, aligns them vertically centered,
  // and has padding and background color to resemble a pill shape.
  featureRow: {
    flexDirection: "row", // horizontal layout (like flex-row)
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)", // same as web's pill-glass class
    borderRadius: 16, // rounded-2xl ≈ 16px in RN
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  // Emoji
  featureEmoji: {
    fontSize: 20,
    marginRight: 12,
  },

  // Feature label
  featureText: {
    flex: 1, // takes remaining space (pushes dot to the right)
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.3, // tracking-wide equivalent
  },

  // Teal dot
  featureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent, // '#00BFA6' teal
  },

  // Bottom Section
  bottomSection: {
    alignItems: "center", // center everything horizontally
    gap: 16,
  },

  // "Get Started"
  getStartedButton: {
    backgroundColor: COLORS.surface, // white
    borderRadius: 28,
    height: 52,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    // Shadow gives the button the "shadow-xl" effect from web
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Button text
  getStartedText: {
    color: COLORS.primary, // '#3D3B8E' indigo
    fontSize: 16,
    fontWeight: "bold",
  },

  // Login link row
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginText: {
    color: COLORS.surface,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.accent, // '#00BFA6' teal
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },

  // Version label
  version: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
});
