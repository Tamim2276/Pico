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
import { useTheme } from "@presentation/context/ThemeContext";

// Stat cards shown in the 2x2 grid at the top of the dashboard
const STATS = [
  {
    key: "pending",
    icon: "📋",
    value: "12",
    label: "Tasks Pending",
    accent: "#3D3B8E",
  },
  {
    key: "events",
    icon: "📅",
    value: "4",
    label: "Events Today",
    accent: "#0E8F7C",
  },
  {
    key: "reminders",
    icon: "⏰",
    value: "8",
    label: "Reminders Set",
    accent: "#F59E0B",
  },
  {
    key: "completed",
    icon: "✅",
    value: "24",
    label: "Completed Today",
    accent: "#10B981",
  },
];

const ACTIVITY = [
  {
    key: "1",
    icon: "📄",
    iconBg: "#FDE2E2",
    title: "Review Q4 Report",
    subtitle: "High Priority • Due 2h",
  },
  {
    key: "2",
    icon: "👥",
    iconBg: "#E4E2FB",
    title: "Team Meeting",
    subtitle: "Event • 2:00 PM",
  },
  {
    key: "3",
    icon: "📞",
    iconBg: "#FCE7D0",
    title: "Call Mom",
    subtitle: "Reminder • 6:00 PM",
  },
];

export default function HomeScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>🧭</Text>
          </View>
          <Text style={styles.brandTitle}>Pico</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.bellButton}>
          <Text style={styles.bellIcon}>🔔</Text>
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>Good Morning, Alex 👋</Text>
        <Text style={styles.dateLabel}>Monday, October 24</Text>

        {/* Stat grid */}
        <View style={styles.statGrid}>
          {STATS.map((stat) => (
            <View
              key={stat.key}
              style={[styles.statCard, { borderLeftColor: stat.accent }]}
            >
              <Text style={[styles.statIcon, { color: stat.accent }]}>
                {stat.icon}
              </Text>
              <Text style={[styles.statValue, { color: stat.accent }]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Recent Activity</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {ACTIVITY.map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.7}
            style={styles.activityCard}
          >
            <View
              style={[styles.activityIconWrap, { backgroundColor: item.iconBg }]}
            >
              <Text style={styles.activityIcon}>{item.icon}</Text>
            </View>
            <View style={styles.activityBody}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.activityChevron}>›</Text>
          </TouchableOpacity>
        ))}

        {/* AI Insight card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeaderRow}>
            <Text style={styles.aiSparkle}>✨</Text>
            <Text style={styles.aiLabel}>AI Insight</Text>
          </View>
          <Text style={styles.aiText}>
            You have a gap between 2 PM and 4 PM. Should I schedule your Q4
            prep then?
          </Text>
          <View style={styles.aiActionsRow}>
            <TouchableOpacity activeOpacity={0.7} style={styles.aiPrimaryButton}>
              <Text style={styles.aiPrimaryButtonText}>Yes, schedule it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.aiSecondaryButton}
            >
              <Text style={styles.aiSecondaryButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Floating mic button */}
      <TouchableOpacity activeOpacity={0.85} style={styles.micButton}>
        <Text style={styles.micIcon}>🎤</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 8,
    },

    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    brandIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    brandIconText: {
      fontSize: 12,
    },

    brandTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
    },

    bellButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },

    bellIcon: {
      fontSize: 18,
    },

    bellBadge: {
      position: "absolute",
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.error,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },

    bellBadgeText: {
      fontSize: 9,
      fontWeight: "bold",
      color: "#FFFFFF",
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 110,
    },

    greeting: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginTop: 6,
    },

    dateLabel: {
      fontSize: 13,
      color: colors.textHint,
      marginTop: 2,
      marginBottom: 20,
    },

    statGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 8,
    },

    statCard: {
      width: "48%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderLeftWidth: 4,
      padding: 16,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },

    statIcon: {
      fontSize: 16,
      marginBottom: 10,
    },

    statValue: {
      fontSize: 26,
      fontWeight: "bold",
      marginBottom: 4,
    },

    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },

    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      marginBottom: 14,
    },

    sectionHeaderTitle: {
      fontSize: 17,
      fontWeight: "bold",
      color: colors.textPrimary,
    },

    viewAllLink: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.primary,
    },

    activityCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },

    activityIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },

    activityIcon: {
      fontSize: 18,
    },

    activityBody: {
      flex: 1,
    },

    activityTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4,
    },

    activitySubtitle: {
      fontSize: 12,
      color: colors.textHint,
    },

    activityChevron: {
      fontSize: 22,
      color: colors.textHint,
      marginLeft: 4,
    },

    aiCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: 20,
      padding: 20,
      marginTop: 8,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    aiHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 6,
    },

    aiSparkle: {
      fontSize: 14,
    },

    aiLabel: {
      fontSize: 13,
      fontWeight: "bold",
      color: colors.accent,
    },

    aiText: {
      fontSize: 14,
      lineHeight: 20,
      color: "rgba(255,255,255,0.9)",
      marginBottom: 18,
    },

    aiActionsRow: {
      flexDirection: "row",
      gap: 10,
    },

    aiPrimaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 11,
    },

    aiPrimaryButtonText: {
      color: colors.primaryDark,
      fontSize: 13,
      fontWeight: "bold",
    },

    aiSecondaryButton: {
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
    },

    aiSecondaryButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "600",
    },

    micButton: {
      position: "absolute",
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },

    micIcon: {
      fontSize: 20,
    },
  });
