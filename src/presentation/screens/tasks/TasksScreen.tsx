import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@presentation/context/ThemeContext";
import { useTasks } from "@presentation/context/TaskContext";
import type { Task, Priority } from "../../domain/entities/Task";

type FilterKey = "All" | "Pending" | "Completed";

const FILTERS: FilterKey[] = ["All", "Pending", "Completed"];

// Small icon shown next to the due-date/category label per task
const CATEGORY_ICON: Record<string, string> = {
  Kitchen: "🛒",
};

interface Props {
  navigation: any;
}

export default function TasksScreen({ navigation }: Props) {
  const { colors, isDarkMode } = useTheme();
  const styles = createStyles(colors);

  const PRIORITY_STYLES: Record<Priority, { bg: string; text: string }> = {
    High: { bg: isDarkMode ? "#4A2A2A" : "#FDE2E2", text: "#E4574C" },
    Medium: { bg: isDarkMode ? "#4A3A20" : "#FCEBD5", text: "#DB8A2E" },
    Low: { bg: isDarkMode ? "#1F4534" : "#DCF6E7", text: "#1FAE6A" },
  };

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("All");
  const { tasks, toggleTaskCompletion } = useTasks();

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) toggleTaskCompletion(task);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesQuery = t.title
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      const matchesFilter =
        filter === "All"
          ? true
          : filter === "Completed"
          ? t.completed
          : !t.completed;
      return matchesQuery && matchesFilter;
    });
  }, [tasks, query, filter]);

  const highPriorityPendingCount = tasks.filter(
    (t) => !t.completed && t.priority === "High"
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar */}
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={colors.textHint}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <TouchableOpacity
                key={f}
                activeOpacity={0.7}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Task list */}
        {filteredTasks.map((task) => {
          const priorityStyle = PRIORITY_STYLES[task.priority];
          const categoryTag = task.category || "General";
          const categoryIcon = CATEGORY_ICON[task.category] || "🏷️";

          const formattedDueDate = task.dueDate
            ? (() => {
                const d = new Date(task.dueDate);
                return !isNaN(d.getTime())
                  ? `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : `Due ${task.dueDate}`;
              })()
            : null;

          return (
            <View key={task.id} style={styles.taskCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.checkbox,
                  task.completed && styles.checkboxChecked,
                ]}
                onPress={() => toggleTask(task.id)}
              >
                {task.completed && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>

              <View style={styles.taskBody}>
                <Text
                  style={[
                    styles.taskTitle,
                    task.completed && styles.taskTitleCompleted,
                  ]}
                >
                  {task.title}
                </Text>

                <View style={styles.taskMetaRow}>
                  <View
                    style={[
                      styles.priorityPill,
                      { backgroundColor: priorityStyle.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityPillText,
                        { color: priorityStyle.text },
                      ]}
                    >
                      {task.priority.toUpperCase()}
                    </Text>
                  </View>

                  {task.completed ? (
                    <Text style={styles.completedLabel}>Completed</Text>
                  ) : (
                    <Text style={styles.taskMetaText}>
                      {formattedDueDate ? `⏰ ${formattedDueDate}` : `${categoryIcon} ${categoryTag}`}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* AI assistant card */}
        <View style={styles.aiCard}>
          <Text style={styles.aiClipboardDecoration}>📋</Text>
          <View style={styles.aiHeaderRow}>
            <Text style={styles.aiSparkle}>✨</Text>
            <Text style={styles.aiLabel}>Pico AI Assistant</Text>
          </View>
          <Text style={styles.aiText}>
            {highPriorityPendingCount > 0
              ? `You have ${highPriorityPendingCount} high-priority task(s) active. I recommend focusing on your top priority first.`
              : `You have ${tasks.filter(t => !t.completed).length} pending task(s). Great job keeping everything organized!`}
          </Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.aiButton}>
            <Text style={styles.aiButtonText}>Plan My Day</Text>
          </TouchableOpacity>
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
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },

    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.primary,
    },

    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },

    addButtonText: {
      color: colors.surface,
      fontSize: 22,
      fontWeight: "600",
      marginTop: -2,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },

    searchWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      height: 48,
      marginBottom: 16,
    },

    searchIcon: {
      fontSize: 15,
      marginRight: 8,
      opacity: 0.6,
    },

    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
    },

    filterRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 18,
    },

    filterPill: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.divider,
    },

    filterPillActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primaryDark,
    },

    filterPillText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
    },

    filterPillTextActive: {
      color: colors.surface,
    },

    taskCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },

    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.divider,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      marginTop: 2,
    },

    checkboxChecked: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },

    checkmark: {
      color: colors.surface,
      fontSize: 14,
      fontWeight: "bold",
    },

    taskBody: {
      flex: 1,
    },

    taskTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 8,
    },

    taskTitleCompleted: {
      textDecorationLine: "line-through",
      color: colors.textHint,
    },

    taskMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    priorityPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },

    priorityPillText: {
      fontSize: 10,
      fontWeight: "bold",
      letterSpacing: 0.3,
    },

    taskMetaText: {
      fontSize: 12,
      color: colors.textHint,
    },

    completedLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.accent,
    },

    aiCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: 20,
      padding: 20,
      marginTop: 4,
      overflow: "hidden",
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    aiClipboardDecoration: {
      position: "absolute",
      right: 8,
      bottom: 4,
      fontSize: 72,
      opacity: 0.08,
    },

    aiHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 6,
    },

    aiSparkle: {
      fontSize: 14,
      color: colors.accent,
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
      marginBottom: 16,
      maxWidth: "85%",
    },

    aiButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },

    aiButtonText: {
      color: colors.primaryDark,
      fontSize: 13,
      fontWeight: "bold",
    },
  });
