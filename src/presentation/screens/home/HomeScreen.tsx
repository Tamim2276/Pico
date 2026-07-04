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
import { useAppState } from "@presentation/hooks/useAppState";

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const {
    tasks,
    events,
    notifications,
    profile,
    insightActive,
    setInsightActive,
    setEvents,
    setNotifications,
    triggerToast,
  } = useAppState();

  const pendingTasksCount = tasks.filter((t) => !t.completed).length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const eventsCount = events.length;
  const unreadNotifCount = notifications.filter((n) => n.isNew).length;

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
    };
    return new Date().toLocaleDateString("en-US", options).toUpperCase();
  };

  const handleScheduleInsight = () => {
    setEvents((prev) => [
      ...prev,
      {
        id: `event-${Date.now()}`,
        title: "Q4 Prep & Briefing",
        timeStart: "14:00",
        timeEnd: "15:30",
        location: "Room 4B",
        type: "review",
      },
    ]);
    setInsightActive(false);
    triggerToast("Q4 Prep scheduled for 2:00 PM!");
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: "AI Scheduled: Q4 Prep",
        description:
          "Your assistant automatically scheduled your Q4 Prep review session in your 2:00 PM free slot.",
        time: "Just now",
        isNew: true,
        type: "event",
      },
      ...prev,
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Top app bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>✦</Text>
          <Text style={styles.headerTitle}>Pico</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.bellButton}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadNotifCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            Good Morning, {profile.name.split(" ")[0]} 👋
          </Text>
          <Text style={styles.dateText}>{getFormattedDate()}</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.statCard, { borderLeftColor: COLORS.primary }]}
            onPress={() => navigation.navigate("Tasks")}
          >
            <Text style={styles.statEmoji}>📋</Text>
            <Text style={[styles.statNumber, { color: COLORS.primary }]}>
              {pendingTasksCount}
            </Text>
            <Text style={styles.statLabel}>Tasks Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.statCard, { borderLeftColor: COLORS.accent }]}
            onPress={() => navigation.navigate("Calendar")}
          >
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={[styles.statNumber, { color: COLORS.accent }]}>
              {eventsCount}
            </Text>
            <Text style={styles.statLabel}>Events Today</Text>
          </TouchableOpacity>

          <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
            <Text style={styles.statEmoji}>⏰</Text>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>8</Text>
            <Text style={styles.statLabel}>Reminders Set</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {completedTasksCount + 22}
            </Text>
            <Text style={styles.statLabel}>Completed Today</Text>
          </View>
        </View>

        {/* Recent activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Tasks")}>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.activityCard, { borderLeftColor: COLORS.error }]}
            onPress={() => navigation.navigate("Tasks")}
          >
            <View style={styles.activityLeft}>
              <View style={[styles.activityIconWrap, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
                <Text style={styles.activityEmoji}>📄</Text>
              </View>
              <View>
                <Text style={styles.activityTitle}>Review Q4 Report</Text>
                <Text style={styles.activityMeta}>HIGH PRIORITY • DUE 2H</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.activityCard, { borderLeftColor: COLORS.primary }]}
            onPress={() => navigation.navigate("Calendar")}
          >
            <View style={styles.activityLeft}>
              <View style={[styles.activityIconWrap, { backgroundColor: "rgba(61,59,142,0.08)" }]}>
                <Text style={styles.activityEmoji}>👥</Text>
              </View>
              <View>
                <Text style={styles.activityTitle}>Team Meeting</Text>
                <Text style={styles.activityMeta}>EVENT • 2:00 PM</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={[styles.activityCard, { borderLeftColor: COLORS.warning }]}>
            <View style={styles.activityLeft}>
              <View style={[styles.activityIconWrap, { backgroundColor: "rgba(245,158,11,0.1)" }]}>
                <Text style={styles.activityEmoji}>📞</Text>
              </View>
              <View>
                <Text style={styles.activityTitle}>Call Mom</Text>
                <Text style={styles.activityMeta}>REMINDER • 6:00 PM</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        {/* AI Insight card */}
        {insightActive && (
          <View style={styles.insightCard}>
            <View style={styles.insightHeaderRow}>
              <Text style={styles.insightSparkle}>✨</Text>
              <Text style={styles.insightLabel}>AI INSIGHT</Text>
            </View>
            <Text style={styles.insightText}>
              You have a gap between 2 PM and 4 PM. Should I schedule your Q4 prep then?
            </Text>
            <View style={styles.insightActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.insightPrimaryBtn}
                onPress={handleScheduleInsight}
              >
                <Text style={styles.insightPrimaryBtnText}>Yes, schedule it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.insightSecondaryBtn}
                onPress={() => setInsightActive(false)}
              >
                <Text style={styles.insightSecondaryBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.fab}
        onPress={() => navigation.navigate("Assistant")}
      >
        <Text style={styles.fabIcon}>🎙️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLogo: { fontSize: 20, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.primary },
  bellButton: { padding: 8 },
  bellIcon: { fontSize: 18 },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: COLORS.surface, fontSize: 9, fontWeight: "bold" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  welcomeSection: { marginBottom: 24 },
  welcomeTitle: { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textHint,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 32 },
  statCard: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    gap: 10,
  },
  statEmoji: { fontSize: 18 },
  statNumber: { fontSize: 24, fontWeight: "800" },
  statLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.textHint,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  section: { marginBottom: 32 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: "bold", color: COLORS.textPrimary },
  viewAllLink: { fontSize: 12, fontWeight: "bold", color: COLORS.primary },

  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  activityLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activityEmoji: { fontSize: 16 },
  activityTitle: { fontSize: 14, fontWeight: "bold", color: COLORS.textPrimary },
  activityMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textHint,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  chevron: { fontSize: 20, color: COLORS.textHint },

  insightCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  insightHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  insightSparkle: { fontSize: 14 },
  insightLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  insightText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.surface,
    lineHeight: 20,
    marginBottom: 16,
  },
  insightActionsRow: { flexDirection: "row", gap: 8 },
  insightPrimaryBtn: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  insightPrimaryBtnText: { fontSize: 12, fontWeight: "bold", color: COLORS.primary },
  insightSecondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  insightSecondaryBtnText: { fontSize: 12, fontWeight: "bold", color: COLORS.surface },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  fabIcon: { fontSize: 22 },
});
