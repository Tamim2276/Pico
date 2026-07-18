import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EVENTS, EVENT_DOTS_BY_DAY } from "@shared/constants/data";
import { useTheme } from "@presentation/context/ThemeContext";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// July 2026 grid — 1 falls on a Wednesday
const CALENDAR_WEEKS: (number | null)[][] = [
  [null, null, null, 1, 2, 3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, null, null, null, null],
];

const EVENT_TYPE_STYLE: Record<
  string,
  { bar: string }
> = {
  meeting: { bar: "#3D3B8E" },
  review: { bar: "#00BFA6" },
  personal: { bar: "#10B981" },
};

interface Props {
  navigation: any;
}

export default function CalendarScreen({ navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const styles = createStyles(colors);

  const [selectedDay, setSelectedDay] = useState(1);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.monthNavButton}>
          <Text style={styles.monthNavIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>July 2026</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.monthNavButton}>
          <Text style={styles.monthNavIcon}>›</Text>
        </TouchableOpacity>

        <View style={styles.headerSpacer} />

        <Text style={styles.headerTitle}>Calendar</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar grid */}
        <View style={styles.calendarCard}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          {CALENDAR_WEEKS.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day, dayIndex) => {
                if (day === null) {
                  return (
                    <View key={dayIndex} style={styles.dayCell} />
                  );
                }

                const isSelected = day === selectedDay;
                const dotCount = EVENT_DOTS_BY_DAY[day] ?? 0;

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
                        isSelected && styles.dayCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
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

        {/* Today's Events */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Today's Events</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {EVENTS.map((event) => {
          const typeStyle =
            EVENT_TYPE_STYLE[event.type] ?? EVENT_TYPE_STYLE.meeting;

          return (
            <TouchableOpacity
              key={event.id}
              activeOpacity={0.7}
              style={[styles.eventCard, { borderLeftColor: typeStyle.bar }]}
            >
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMetaText}>
                  🕐 {event.timeStart} - {event.timeEnd}
                </Text>
                <Text style={styles.eventMetaText}>📍 {event.location}</Text>
              </View>

              {event.type === "meeting" && event.attendeeAvatars && (
                <View style={styles.avatarStack}>
                  {event.attendeeAvatars.map((avatar, index) => (
                    <View
                      key={index}
                      style={[
                        styles.avatarBubble,
                        { marginLeft: index === 0 ? 0 : -10 },
                      ]}
                    >
                      <Text style={styles.avatarEmoji}>{avatar}</Text>
                    </View>
                  ))}
                  {!!event.attendeesCount && (
                    <View style={[styles.avatarBubble, styles.avatarMore]}>
                      <Text style={styles.avatarMoreText}>
                        +{event.attendeesCount}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {event.type === "review" && (
                <Text style={styles.eventTrailingIcon}>📹</Text>
              )}

              {event.type === "personal" && (
                <Text style={styles.eventTrailingIcon}>⤢</Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* AI Insight card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeaderRow}>
            <Text style={styles.aiRobotIcon}>🤖</Text>
            <Text style={styles.aiLabel}>AI INSIGHT</Text>
          </View>
          <Text style={styles.aiHeadline}>
            You have a free 2-hour block after your review.
          </Text>
          <Text style={styles.aiText}>
            Would you like me to schedule the Q3 Planning draft during this
            time?
          </Text>
          <View style={styles.aiActionsRow}>
            <TouchableOpacity activeOpacity={0.7} style={styles.aiPrimaryButton}>
              <Text style={styles.aiPrimaryButtonText}>Yes, please</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.aiSecondaryButton}
            >
              <Text style={styles.aiSecondaryButtonText}>Ignore</Text>
            </TouchableOpacity>
          </View>
        </View>
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
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },

    monthNavButton: {
      width: 26,
      height: 26,
      alignItems: "center",
      justifyContent: "center",
    },

    monthNavIcon: {
      fontSize: 18,
      color: colors.primary,
      fontWeight: "600",
    },

    monthLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      marginHorizontal: 2,
    },

    headerSpacer: {
      flex: 1,
    },

    headerTitle: {
      fontSize: 17,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginRight: 12,
    },

    headerActions: {
      flexDirection: "row",
      gap: 4,
    },

    iconButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },

    iconButtonText: {
      fontSize: 16,
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

    dayNumber: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textPrimary,
    },

    dayNumberSelected: {
      color: "#FFFFFF",
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

    avatarStack: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 8,
    },

    avatarBubble: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.inputBg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.surface,
    },

    avatarEmoji: {
      fontSize: 12,
    },

    avatarMore: {
      backgroundColor: colors.primaryDark,
      marginLeft: -10,
    },

    avatarMoreText: {
      fontSize: 10,
      fontWeight: "bold",
      color: "#FFFFFF",
    },

    eventTrailingIcon: {
      fontSize: 20,
      color: colors.accent,
      marginLeft: 8,
    },

    aiCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: 20,
      padding: 20,
      marginTop: 4,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    aiHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      gap: 8,
    },

    aiRobotIcon: {
      fontSize: 16,
    },

    aiLabel: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.accent,
      letterSpacing: 0.6,
    },

    aiHeadline: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#FFFFFF",
      lineHeight: 24,
      marginBottom: 10,
    },

    aiText: {
      fontSize: 14,
      lineHeight: 20,
      color: "rgba(255,255,255,0.85)",
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
  });
