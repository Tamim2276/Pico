import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type MessageCard = {
  type: "task_created" | "event_created" | "battery" | "general_card";
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "typing";
  text: string;
  card?: MessageCard;
};

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const text = message.text;

  // Auto-detect tool card patterns from text if card object is not explicitly provided
  const isTaskCreated = text.includes("Created task:");
  const isEventScheduled = text.includes("Scheduled event:");
  const isGoalPlan = text.includes("Goal Plan Created:");
  const isTimerSet = text.includes("Timer set");
  const isWeather = text.includes("Weather for");

  let cardInfo: MessageCard | undefined = message.card;

  if (!cardInfo && isGoalPlan) {
    const goalMatch = text.match(/Goal Plan Created:\s*["'`]?([^"'`\(\n\r]+)["'`]?/i);
    const goalTitle = goalMatch && goalMatch[1] ? goalMatch[1].trim() : "Goal Roadmap";
    cardInfo = {
      type: "task_created",
      title: goalTitle,
      subtitle: "Multi-step plan added to your tasks list",
      badge: "Goal Plan",
      badgeColor: "#8B5CF6",
      icon: "🎯",
    };
  } else if (!cardInfo && isTimerSet) {
    const timerMatch = text.match(/Timer set(?: for "([^"]+)")? for ([^\n!]+)/i);
    const label = timerMatch && timerMatch[1] ? timerMatch[1] : "Timer";
    const dur = timerMatch && timerMatch[2] ? timerMatch[2] : "Active";
    cardInfo = {
      type: "task_created",
      title: label === "Timer" ? `Timer: ${dur}` : `${label} (${dur})`,
      subtitle: "Will alert when countdown finishes",
      badge: "Timer Active",
      badgeColor: "#F59E0B",
      icon: "⏱️",
    };
  } else if (!cardInfo && isWeather) {
    const locMatch = text.match(/Weather for ([^:\n]+):/i);
    const loc = locMatch ? locMatch[1].trim() : "Current Location";
    const weatherDetails = text
      .split("\n")
      .filter((l) => !l.includes("━━━━━━━━") && !l.toLowerCase().includes("weather for"))
      .map((l) => l.trim())
      .filter(Boolean);

    const mainCond = weatherDetails.find((l) => l.includes("°C")) || "Live Weather Report";

    cardInfo = {
      type: "task_created",
      title: loc,
      subtitle: mainCond,
      badge: "Live Weather",
      badgeColor: "#0EA5E9",
      icon: "🌤️",
    };
  } else if (!cardInfo && isTaskCreated) {
    const titleMatch = text.match(/Created task:\s*["'`]?([^"'`\(\n\r]+)["'`]?/i);
    const priorityMatch = text.match(/Priority:\s*([A-Za-z]+)/i);
    const priority = priorityMatch ? priorityMatch[1] : "Medium";
    const title = titleMatch && titleMatch[1] && titleMatch[1].trim() ? titleMatch[1].trim() : "Task Created";
    cardInfo = {
      type: "task_created",
      title: title,
      subtitle: "Saved to your offline database",
      badge: priority,
      badgeColor: priority === "High" ? "#EF4444" : priority === "Medium" ? "#F59E0B" : "#10B981",
      icon: "📋",
    };
  } else if (!cardInfo && isEventScheduled) {
    const titleMatch = text.match(/Scheduled event:\s*["'`]?([^"'`\(\n\r]+)["'`]?/i);
    const title = titleMatch && titleMatch[1] && titleMatch[1].trim() ? titleMatch[1].trim() : "Event Scheduled";
    cardInfo = {
      type: "event_created",
      title: title,
      subtitle: "Added to your calendar schedule",
      badge: "Calendar",
      badgeColor: "#3B82F6",
      icon: "🗓️",
    };
  }

  const stepLines = isGoalPlan
    ? text
        .split("\n")
        .filter((l) => l.includes("🔴") || l.includes("🟡") || l.includes("🟢") || l.match(/^\s*(?:[-*•]|\d+\.)/))
        .map((l) => l.trim())
    : [];

  const weatherDetailLines = isWeather
    ? text
        .split("\n")
        .filter((l) => !l.includes("━━━━━━━━") && !l.toLowerCase().includes("weather for") && !l.includes("°C"))
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.picoContainer,
      ]}
    >
      {cardInfo ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>{cardInfo.icon || "✨"}</Text>
            <View style={styles.cardHeaderTextWrap}>
              <Text style={styles.cardTitle}>{cardInfo.title}</Text>
              {!!cardInfo.subtitle && (
                <Text style={styles.cardSubtitle}>{cardInfo.subtitle}</Text>
              )}
            </View>
            {!!cardInfo.badge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: cardInfo.badgeColor || "#3B82F6" },
                ]}
              >
                <Text style={styles.badgeText}>{cardInfo.badge}</Text>
              </View>
            )}
          </View>

          {stepLines.length > 0 && (
            <View style={styles.stepsContainer}>
              <View style={styles.cardDivider} />
              <Text style={styles.stepsHeader}>Actionable Roadmap:</Text>
              {stepLines.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <Text style={styles.stepText}>{step.replace(/^[•\-\*]\s*/, "")}</Text>
                </View>
              ))}
            </View>
          )}

          {weatherDetailLines.length > 0 && (
            <View style={styles.stepsContainer}>
              <View style={styles.cardDivider} />
              {weatherDetailLines.map((line, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <Text style={styles.stepText}>{line}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.text}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "88%",
    padding: 10,
    borderRadius: 18,
    marginVertical: 6,
  },

  userContainer: {
    alignSelf: "flex-end",
    backgroundColor: "#2F80ED",
    borderBottomRightRadius: 4,
  },

  picoContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#242526",
    borderBottomLeftRadius: 4,
  },

  text: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
    padding: 4,
  },

  card: {
    backgroundColor: "#1E1F20",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minWidth: 260,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardIcon: {
    fontSize: 22,
    marginRight: 10,
  },

  cardHeaderTextWrap: {
    flex: 1,
    justifyContent: "center",
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    flexWrap: "wrap",
  },

  cardSubtitle: {
    color: "#A0A0A0",
    fontSize: 12,
    marginTop: 2,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
    alignSelf: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  stepsContainer: {
    marginTop: 10,
  },

  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 8,
  },

  stepsHeader: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },

  stepText: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});