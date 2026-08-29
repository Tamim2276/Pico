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

  let cardInfo: MessageCard | undefined = message.card;

  if (!cardInfo && isTaskCreated) {
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
        </View>
      ) : (
        <Text style={styles.text}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "85%",
    padding: 12,
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
  },

  card: {
    backgroundColor: "#1E1F20",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minWidth: 220,
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
});