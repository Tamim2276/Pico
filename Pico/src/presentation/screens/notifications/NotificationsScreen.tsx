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

function relativeLabel(d: Date): string {
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  if (mins < 60) return `in ${Math.max(mins, 1)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

interface Props {
  navigation: any;
}

export default function NotificationsScreen({ navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const styles = createStyles(colors);

  const [perm, setPerm] = useState<PermState>("unknown");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<DeviceEvent[]>([]);

  const load = useCallback(async () => {
    const granted = await ensureCalendarPermission();
    if (!granted) {
      setPerm("denied");
      setLoading(false);
      return;
    }
    setPerm("granted");
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    try {
      const events = await fetchEvents(now, in7);
      setItems(events.filter((e) => (e.end ?? e.start).getTime() >= now.getTime()));
    } catch {
      setItems([]);
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
        <Text style={styles.headerTitle}>Notifications</Text>
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
              Allow calendar access so Pico can remind you about upcoming events.
            </Text>
          </View>
        )}

        {!loading && perm === "granted" && items.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateEmoji}>🔔</Text>
            <Text style={styles.stateTitle}>You're all caught up</Text>
            <Text style={styles.stateText}>No reminders in the next 7 days.</Text>
          </View>
        )}

        {!loading &&
          items.map((e) => (
            <TouchableOpacity
              key={e.id}
              activeOpacity={0.7}
              style={styles.card}
              onPress={() => openNativeCalendar(e.start)}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.inputBg }]}>
                <Text style={styles.icon}>🔔</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{e.title}</Text>
                <Text style={styles.subtitle}>
                  {e.allDay
                    ? "All day"
                    : e.start.toLocaleString([], {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  {"  ·  "}
                  {relativeLabel(e.start)}
                </Text>
              </View>
            </TouchableOpacity>
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
