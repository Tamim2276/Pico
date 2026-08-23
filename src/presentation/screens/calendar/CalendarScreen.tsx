import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Calendar from "expo-calendar";
import { useTheme } from "@presentation/context/ThemeContext";
import { useEvents } from "@presentation/context/EventContext";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MAX_DOTS = 3;

type PermState = "unknown" | "granted" | "denied";

// Normalised event shape we render from the device calendar.
interface DeviceEvent {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  location: string;
  calendarColor?: string;
}

// Build the weeks matrix (numbers + trailing/leading nulls) for a given month.
function buildWeeks(year: number, month: number): (number | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function sameDay(a: Date, y: number, m: number, d: number): boolean {
  return a.getFullYear() === y && a.getMonth() === m && a.getDate() === d;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Deep-link into the phone's native calendar app at the given date.
async function openNativeCalendar(date: Date): Promise<void> {
  const ms = date.getTime();
  try {
    if (Platform.OS === "ios") {
      await Linking.openURL(`calshow:${Math.floor(ms / 1000)}`);
    } else {
      await Linking.openURL(`content://com.android.calendar/time/${ms}`);
    }
  } catch {
    try {
      await Linking.openURL("content://com.android.calendar/time");
    } catch {
      // no calendar app available — nothing more we can do
    }
  }
}

interface Props {
  navigation: any;
}

export default function CalendarScreen({ navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const styles = createStyles(colors);

  const { events: localEvents } = useEvents();

  const today = useMemo(() => new Date(), []);

  const [perm, setPerm] = useState<PermState>("unknown");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<DeviceEvent[]>([]);

  const [visibleYear, setVisibleYear] = useState(today.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  const weeks = useMemo(
    () => buildWeeks(visibleYear, visibleMonth),
    [visibleYear, visibleMonth]
  );

  // Ask for calendar permission once on mount.
  useEffect(() => {
    (async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      setPerm(status === "granted" ? "granted" : "denied");
    })();
  }, []);

  // Load events for the visible month whenever it (or permission) changes.
  const loadEvents = useCallback(async () => {
    if (perm !== "granted") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );
      if (calendars.length === 0) {
        setEvents([]);
        return;
      }

      const colorById: Record<string, string> = {};
      calendars.forEach((c) => {
        colorById[c.id] = c.color;
      });

      const rangeStart = new Date(visibleYear, visibleMonth, 1, 0, 0, 0);
      const rangeEnd = new Date(visibleYear, visibleMonth + 1, 0, 23, 59, 59);

      const raw = await Calendar.getEventsAsync(
        calendars.map((c) => c.id),
        rangeStart,
        rangeEnd
      );

      const mapped: DeviceEvent[] = raw.map((e) => ({
        id: e.id,
        title: e.title || "(untitled)",
        start: new Date(e.startDate),
        end: e.endDate ? new Date(e.endDate) : null,
        allDay: !!e.allDay,
        location: e.location || "",
        calendarColor: colorById[e.calendarId],
      }));

      setEvents(mapped);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [perm, visibleYear, visibleMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const requestPermissionAgain = useCallback(async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === "granted") {
      setPerm("granted");
    } else {
      // Second denial usually means "blocked" — send them to settings.
      Linking.openSettings().catch(() => {});
    }
  }, []);

  // Combine native and local events
  const allEvents = useMemo(() => {
    const mappedLocal = localEvents.map(e => ({
      id: e.id,
      title: e.title,
      start: new Date(e.startTime),
      end: new Date(e.endTime),
      allDay: false,
      location: e.location || "",
      calendarColor: colors.primary,
    }));
    return [...events, ...mappedLocal];
  }, [events, localEvents, colors.primary]);

  // Count of events per day-number in the visible month (for the dots).
  const dotsByDay = useMemo(() => {
    const map: Record<number, number> = {};
    allEvents.forEach((e) => {
      if (
        e.start.getFullYear() === visibleYear &&
        e.start.getMonth() === visibleMonth
      ) {
        const d = e.start.getDate();
        map[d] = (map[d] ?? 0) + 1;
      }
    });
    return map;
  }, [allEvents, visibleYear, visibleMonth]);

  // Events on the currently selected day, sorted (all-day first, then by time).
  const dayEvents = useMemo(() => {
    return allEvents
      .filter((e) => sameDay(e.start, visibleYear, visibleMonth, selectedDay))
      .sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.start.getTime() - b.start.getTime();
      });
  }, [allEvents, visibleYear, visibleMonth, selectedDay]);

  const goToMonth = useCallback(
    (delta: number) => {
      let m = visibleMonth + delta;
      let y = visibleYear;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      setVisibleYear(y);
      setVisibleMonth(m);
      // Keep "today" selected if we land on the current month, else day 1.
      setSelectedDay(
        y === today.getFullYear() && m === today.getMonth()
          ? today.getDate()
          : 1
      );
    },
    [visibleMonth, visibleYear, today]
  );

  const goToToday = useCallback(() => {
    setVisibleYear(today.getFullYear());
    setVisibleMonth(today.getMonth());
    setSelectedDay(today.getDate());
  }, [today]);

  const selectedDate = new Date(visibleYear, visibleMonth, selectedDay);
  const isTodaySelected = sameDay(
    today,
    visibleYear,
    visibleMonth,
    selectedDay
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.openAppButton}
          onPress={() => openNativeCalendar(selectedDate)}
        >
          <Text style={styles.openAppButtonText}>📅 Open Calendar app</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Calendar grid */}
        <View style={styles.calendarCard}>
          {/* Month nav row */}
          <View style={styles.monthRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.monthNavButton}
              onPress={() => goToMonth(-1)}
            >
              <Text style={styles.monthNavIcon}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.monthLabel}>
              {MONTH_NAMES[visibleMonth]} {visibleYear}
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.monthNavButton}
              onPress={() => goToMonth(1)}
            >
              <Text style={styles.monthNavIcon}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day, dayIndex) => {
                if (day === null) {
                  return <View key={dayIndex} style={styles.dayCell} />;
                }

                const isSelected = day === selectedDay;
                const isToday = sameDay(today, visibleYear, visibleMonth, day);
                const dotCount = Math.min(dotsByDay[day] ?? 0, MAX_DOTS);

                return (
                  <TouchableOpacity
                    key={dayIndex}
                    activeOpacity={0.7}
                    style={styles.dayCell}
                    onPress={() => setSelectedDay(day)}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isToday && !isSelected && styles.dayCircleToday,
                        isSelected && styles.dayCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          isToday && !isSelected && styles.dayNumberToday,
                          isSelected && styles.dayNumberSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                    <View style={styles.dotRow}>
                      {Array.from({ length: dotCount }).map((_, i) => (
                        <View key={i} style={styles.eventDot} />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Section header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>
            {isTodaySelected
              ? "Today's Events"
              : `${MONTH_NAMES[visibleMonth]} ${selectedDay}`}
          </Text>
          {!isTodaySelected && (
            <TouchableOpacity activeOpacity={0.7} onPress={goToToday}>
              <Text style={styles.viewAllLink}>Today</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Permission gate */}
        {perm === "denied" && (
          <View style={styles.stateCard}>
            <Text style={styles.stateEmoji}>🔒</Text>
            <Text style={styles.stateTitle}>Calendar access needed</Text>
            <Text style={styles.stateText}>
              Allow calendar access so Pico can show your real events here.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.stateButton}
              onPress={requestPermissionAgain}
            >
              <Text style={styles.stateButtonText}>Grant access</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {perm === "granted" && loading && !refreshing && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.stateText, { marginTop: 12 }]}>
              Loading your events…
            </Text>
          </View>
        )}

        {/* Empty */}
        {perm === "granted" && !loading && dayEvents.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateEmoji}>🗓️</Text>
            <Text style={styles.stateTitle}>No events</Text>
            <Text style={styles.stateText}>
              Nothing scheduled for this day.
            </Text>
          </View>
        )}

        {/* Real events for the selected day */}
        {perm === "granted" &&
          !loading &&
          dayEvents.map((event) => {
            const bar = event.calendarColor || colors.primary;
            return (
              <TouchableOpacity
                key={event.id}
                activeOpacity={0.7}
                style={[styles.eventCard, { borderLeftColor: bar }]}
                onPress={() => openNativeCalendar(event.start)}
              >
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventMetaText}>
                    🕐{" "}
                    {event.allDay
                      ? "All day"
                      : `${formatTime(event.start)}${
                          event.end ? ` – ${formatTime(event.end)}` : ""
                        }`}
                  </Text>
                  {!!event.location && (
                    <Text style={styles.eventMetaText}>
                      📍 {event.location}
                    </Text>
                  )}
                </View>
                <Text style={styles.eventTrailingIcon}>›</Text>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
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
      paddingBottom: 12,
    },

    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
    },

    openAppButton: {
      backgroundColor: colors.inputBg,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },

    openAppButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
    },

    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      gap: 8,
    },

    monthNavButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },

    monthNavIcon: {
      fontSize: 22,
      color: colors.primary,
      fontWeight: "600",
    },

    monthLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
      minWidth: 150,
      textAlign: "center",
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    calendarCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },

    weekdayRow: {
      flexDirection: "row",
      marginBottom: 8,
    },

    weekdayLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "600",
      color: colors.textHint,
    },

    weekRow: {
      flexDirection: "row",
    },

    dayCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 6,
    },

    dayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },

    dayCircleSelected: {
      backgroundColor: colors.primaryDark,
    },

    dayCircleToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },

    dayNumber: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textPrimary,
    },

    dayNumberSelected: {
      color: "#FFFFFF",
      fontWeight: "700",
    },

    dayNumberToday: {
      color: colors.primary,
      fontWeight: "700",
    },

    dotRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 3,
      height: 6,
      marginTop: 3,
    },

    eventDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accent,
    },

    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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

    eventCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderLeftWidth: 4,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },

    eventBody: {
      flex: 1,
    },

    eventTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 6,
    },

    eventMetaText: {
      fontSize: 12,
      color: colors.textHint,
      marginTop: 2,
    },

    eventTrailingIcon: {
      fontSize: 22,
      color: colors.textHint,
      marginLeft: 8,
    },

    stateCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },

    stateEmoji: {
      fontSize: 28,
      marginBottom: 10,
    },

    stateTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 6,
    },

    stateText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
    },

    stateButton: {
      marginTop: 16,
      backgroundColor: colors.primaryDark,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },

    stateButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "bold",
    },
  });
