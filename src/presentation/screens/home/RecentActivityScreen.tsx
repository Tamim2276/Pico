import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@presentation/context/ThemeContext";
import {
  DeviceEvent,
  ensureCalendarPermission,
  fetchEvents,
  openNativeCalendar,
} from "@data/calendar/deviceCalendar";

type PermState = "unknown" | "granted" | "denied";

interface Section {
  key: string;
  label: string;
  data: DeviceEvent[];
}

interface Props {
  navigation: any;
}

export default function RecentActivityScreen({ navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const styles = createStyles(colors);

  const [perm, setPerm] = useState<PermState>("unknown");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);

  const load = useCallback(async () => {
    const granted = await ensureCalendarPermission();
    if (!granted) {
      setPerm("denied");
      setLoading(false);
      return;
    }
    setPerm("granted");
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    try {
      const events = await fetchEvents(start, end);
      const upcoming = events
        .filter((e) => (e.end ?? e.start).getTime() >= now.getTime())
        .slice(0, 30);
      const past = events
        .filter((e) => (e.end ?? e.start).getTime() < now.getTime())
        .reverse()
        .slice(0, 30);

      const next: Section[] = [];
      if (upcoming.length) next.push({ key: "up", label: "Upcoming", data: upcoming });
      if (past.length) next.push({ key: "past", label: "Earlier", data: past });
      setSections(next);
    } catch {
      setSections([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const isEmpty = perm === "granted" && !loading && sections.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recent Activity</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !refreshing && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {!loading && perm === "denied" && (
          <View style={styles.stateCard}>
            <Text style={styles.stateEmoji}>🔒</Text>
            <Text style={styles.stateTitle}>Calendar access needed</Text>
            <Text style={styles.stateText}>
              Allow calendar access so Pico can show your activity here.
            </Text>
          </View>
        )}

        {isEmpty && (
          <View style={styles.stateCard}>
            <Text style={styles.stateEmoji}>🗂️</Text>
            <Text style={styles.stateTitle}>Nothing yet</Text>
            <Text style={styles.stateText}>No recent or upcoming activity.</Text>
          </View>
        )}

        {!loading &&
          sections.map((section) => (
            <View key={section.key}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {section.data.map((e) => {
                const past = (e.end ?? e.start).getTime() < Date.now();
                return (
                  <TouchableOpacity
                    key={e.id}
                    activeOpacity={0.7}
                    style={styles.card}
                    onPress={() => openNativeCalendar(e.start)}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: e.color ? `${e.color}22` : colors.inputBg },
                      ]}
                    >
                      <Text style={styles.icon}>{past ? "✅" : "📅"}</Text>
                    </View>
                    <View style={styles.body}>
                      <Text style={[styles.title, past && styles.titlePast]}>{e.title}</Text>
                      <Text style={styles.subtitle}>
                        {e.start.toLocaleDateString([], { month: "short", day: "numeric" })}
                        {!e.allDay &&
                          `  ·  ${e.start.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`}
                        {!!e.location && `  ·  ${e.location}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backIcon: { fontSize: 30, color: colors.primary, fontWeight: "600", marginTop: -4 },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: colors.textPrimary },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    sectionLabel: {
      fontSize: 12,
      fontWeight: "bold",
      letterSpacing: 0.6,
      color: colors.primary,
      textTransform: "uppercase",
      marginTop: 14,
      marginBottom: 10,
    },

    card: {
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
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    icon: { fontSize: 18 },
    body: { flex: 1 },
    title: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 },
    titlePast: { color: colors.textHint },
    subtitle: { fontSize: 12, color: colors.textHint },

    stateCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      marginTop: 40,
    },
    stateEmoji: { fontSize: 28, marginBottom: 10 },
    stateTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 },
    stateText: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 18 },
  });
