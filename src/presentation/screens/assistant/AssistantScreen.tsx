import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";

import { createLLMProvider } from "@shared/utils/llm";
import { parseToolCallFromGemma, executeToolCallFromGemma } from "@shared/utils/toolExecutor";
import toolList from "@shared/utils/tool_list.json";

import ChatInput from "../../components/ChatInput";
import MeshBackground from "../../components/MeshBackground2";
import ToolMenu from "@presentation/components/ToolMenu";
import ModelPickerSheet from "@presentation/components/ModelPickerSheet";
import Welcome from "@presentation/components/Welcome";
import MessageBubble from "../../components/MessageBubble";
import type { MessageCard } from "../../components/MessageBubble";
import TypingIndicator from "@presentation/components/TypingIndicator";
import { rescheduleBus } from "@data/notifications/rescheduleBus";
import { useTasks } from "@presentation/context/TaskContext";
import { matchIntent, runTool } from "@data/tools/dispatcher";


type Message = {
  id: string;
  role: "user" | "assistant" | "typing";
  text: string;
  card?: MessageCard;
};

/**
 * Builds a chat card from a tool result's shape, so route or web-search
 * results render inline (a live OSM map, or an embedded results preview)
 * instead of just a text sentence. Detects the shape of `data` rather
 * than checking the tool name, so it works no matter which entry point
 * (chat fast-path, the tools menu, or the on-device model) produced it.
 * Returns undefined for anything that doesn't match a known card shape.
 */
function buildCardFromToolResult(toolResult: { ok: boolean; data?: unknown }): MessageCard | undefined {
  if (!toolResult.ok || !toolResult.data) return undefined;

  const routeData = toolResult.data as
    | {
        origin: { lat: number; lon: number };
        destination: { lat: number; lon: number };
        path: [number, number][];
        distanceLabel: string;
        durationLabel: string;
        destinationLabel: string;
      }
    | undefined;

  if (routeData?.path?.length && routeData.origin && routeData.destination) {
    return {
      type: "route_map",
      title: routeData.destinationLabel,
      subtitle: `${routeData.distanceLabel} · ${routeData.durationLabel} by car`,
      badge: "Route",
      badgeColor: "#3B82F6",
      icon: "🧭",
      route: routeData,
    };
  }

  const webData = toolResult.data as
    | { query: string; previewUrl: string; browserUrl: string }
    | undefined;

  if (webData?.previewUrl && webData.browserUrl) {
    return {
      type: "web_preview",
      title: webData.query,
      badge: "Web",
      badgeColor: "#8B5CF6",
      icon: "🔎",
      web: webData,
    };
  }

  return undefined;
}

// Simple sanitizer to clean up function-call tokens from Gemma output
const sanitizeGemmaOutput = (s: string) => {
  if (!s) return s;
  // collapse repeated start tags
  s = s.replace(/(?:<start_function_call>)+/g, '<start_function_call>');
  // extract content between start_function_call and escape if present
  const m = s.match(/<start_function_call>([\s\S]*?)<escape>/);
  if (m) return m[1].trim();
  // otherwise strip any angle-bracket tags and trim
  return s.replace(/<[^>]+>/g, '').trim();
};

const buildToolAwarePrompt = (userText: string, telemetry: string) => [
  "You are Pico, an intelligent offline personal assistant.",
  telemetry,
  "",
  "Instructions:",
  "- If the user is chatting, greeting, or asking about Pico itself (e.g. 'Hi', 'Who are you'), reply naturally in plain text. NEVER output JSON for general conversation.",
  "- If the user asks a factual or current-info question you don't have an exact action for — prices, release dates, current events, general knowledge, 'what/who/when/how much' questions — call answer_question. Do NOT guess the answer yourself, and do NOT force it into an unrelated tool like get_weather.",
  "- ONLY emit JSON when the user specifically requests an action (create task, schedule event, set timer, turn on light, daily briefing, or a lookup via answer_question).",
  "",
  "Examples:",
  "User: Hi",
  "Pico: Hello! How can I help you today? 👋",
  "",
  "User: Who are you?",
  "Pico: I am Pico, your private on-device AI assistant.",
  "",
  "User: What is today's date?",
  "Pico: Today is Sunday, August 30, 2026.",
  "",
  "User: Turn on flashlight",
  '{"name": "toggle_flashlight", "args": {"state": "on"}}',
  "",
  "User: Set a timer for 20 minutes for baking",
  '{"name": "set_timer", "args": {"duration": "20 minutes", "label": "Baking"}}',
  "",
  "User: What is the weather outside?",
  '{"name": "get_weather", "args": {}}',
  "",
  "User: What is the current price of gold?",
  '{"name": "answer_question", "args": {"query": "current price of gold"}}',
  "",
  "User: When will Avengers Doomsday be released?",
  '{"name": "answer_question", "args": {"query": "Avengers Doomsday release date"}}',
  "",
  "User: Who is the president of Brazil?",
  '{"name": "answer_question", "args": {"query": "president of Brazil"}}',
  "",
  "User: How do I get to Gulshan 2?",
  '{"name": "get_route", "args": {"destination": "Gulshan 2"}}',
  "",
  "User: Open Google Maps",
  '{"name": "open_in_maps", "args": {"destination": ""}}',
  "",
  "User: Add a task to buy groceries tomorrow with High priority",
  '{"name": "create_task", "args": {"title": "Buy groceries", "priority": "High", "category": "Grocery"}}',
  "",
  "User: Help me plan my project presentation",
  '{"name": "break_down_goal", "args": {"goal": "Project presentation"}}',
  "",
  "User: Mark buy groceries as done",
  '{"name": "mark_task_completed", "args": {"title": "Buy groceries"}}',
  "",
  "User: Give me a daily briefing",
  '{"name": "daily_briefing", "args": {}}',
  "",
  "User: What tasks do I have?",
  '{"name": "read_tasks", "args": {}}',
  "",
  `User: ${userText}`,
  "Pico:"
].join("\n");

export function AssistantScreen() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [gemmaLoading, setGemmaLoading] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  // Remembers an action Pico just offered ("want me to open that for
  // you?") so a plain "yes" can actually run it instead of being sent to
  // the on-device model cold, which tends to hallucinate a made-up tool
  // name when it has no real context for what "yes" refers to.
  const [pendingAction, setPendingAction] = useState<{ name: string; args: Record<string, any> } | null>(null);
  const { tasks } = useTasks();

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({
        animated: true,
      });
    }
  }, [messages]);

  // Push a message from Pico into the chat (used by the reschedule bus).
  const pushAssistantMessage = (text: string) => {
    setMessages(previous =>
      previous.concat({
        id: `${Date.now().toString()}-tool`,
        role: "assistant",
        text,
      })
    );
  };

  // Push a tool result from the tools menu into the chat, attaching a
  // route map card when the result has route geometry in it.
  const pushToolMenuResult = (result: { ok: boolean; message: string; data?: unknown }) => {
    setMessages(previous =>
      previous.concat({
        id: `${Date.now().toString()}-tool`,
        role: "assistant",
        text: result.message,
        card: buildCardFromToolResult(result),
      })
    );
  };

  // React to Yes/No taps on the reschedule notification.
  useEffect(() => {
    const unsubscribe = rescheduleBus.subscribe(choice => {
      pushAssistantMessage(
        choice === "yes"
          ? "Great — let's reschedule. When works better for you? 🗓️"
          : "No problem, I'll keep your schedule as it is. 👍"
      );
    });
    return unsubscribe;
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || gemmaLoading) return;

    const text = inputText.trim();
    const baseId = Date.now().toString();

    const userMessage: Message = {
      id: `${baseId}-user`,
      role: "user",
      text,
    };

    // 0. Pending-action follow-up — if Pico just offered to do something
    // ("want me to open that for you?"), handle a plain yes/no directly
    // instead of sending it cold to the on-device model, which has no way
    // to know what "yes" refers to and tends to invent a fake tool name.
    if (pendingAction) {
      const isYes = /^(yes|yeah|yep|yup|sure|ok(ay)?|go ahead|do it|please|open it)\b/i.test(text);
      const isNo = /^(no|nope|nah|never\s*mind|cancel|don'?t|forget it)\b/i.test(text);
      const action = pendingAction;
      setPendingAction(null);

      if (isYes || isNo) {
        setInputText("");
        let responseText: string;
        let card: MessageCard | undefined;

        if (isYes) {
          const toolResult = await runTool(action.name, action.args);
          responseText = toolResult.message;
          card = buildCardFromToolResult(toolResult);
        } else {
          responseText = "No problem — let me know if you need anything else.";
        }

        setMessages(prev => [
          ...prev,
          userMessage,
          { id: `${baseId}-pico`, role: "assistant", text: responseText, card },
        ]);
        return;
      }
      // Neither yes nor no — treat as an unrelated new message and fall
      // through to normal handling below (pendingAction already cleared).
    }

    // 1. Layer 1 Fast-Path Router (0ms response for unambiguous commands & greetings)
    const fastCall = matchIntent(text);
    if (fastCall) {
      setInputText("");

      let responseText: string;
      let card: MessageCard | undefined;

      if (fastCall.directMessage) {
        responseText = fastCall.directMessage;
      } else {
        const toolResult = await runTool(fastCall.name, fastCall.args);
        responseText = toolResult.message;
        card = buildCardFromToolResult(toolResult);

        const suggestedFallback = (toolResult.data as any)?.suggestedFallback;
        if (!toolResult.ok && suggestedFallback) {
          setPendingAction(suggestedFallback);
        }
      }

      setMessages(prev => [
        ...prev,
        userMessage,
        {
          id: `${baseId}-pico`,
          role: "assistant",
          text: responseText,
          card,
        },
      ]);
      return;
    }

    setMessages(previous => [
      ...previous,
      userMessage,
      {
        id: `${baseId}-typing`,
        role: "typing",
        text: "",
      },
    ]);

    setInputText("");
    setGemmaLoading(true);

    try {
      const now = new Date();
      const dateIso = now.toISOString().split('T')[0]; // "2026-08-30"
      const timeStr = now.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
      const pendingCount = tasks.filter(t => !t.completed).length;
      const telemetry = `[Today's Date: ${dateIso} (${timeStr}) | Pending Tasks: ${pendingCount}]`;

      const provider = createLLMProvider();
      const result = await provider.generate(buildToolAwarePrompt(text, telemetry));
      const raw = typeof result === "string" ? result : JSON.stringify(result);

      const toolCall = parseToolCallFromGemma(raw);
      if (toolCall) {
        const toolResult = await executeToolCallFromGemma(raw);
        const picoMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          text: toolResult.message || "Tool finished.",
          card: buildCardFromToolResult(toolResult),
        };

        const suggestedFallback = (toolResult.data as any)?.suggestedFallback;
        if (!toolResult.ok && suggestedFallback) {
          setPendingAction(suggestedFallback);
        }

        setMessages(previous =>
          previous
            .filter(message => message.role !== "typing")
            .concat(picoMessage)
        );
        return;
      }

      const cleaned = sanitizeGemmaOutput(raw);
      const finalText = cleaned.trim() || raw.trim() || "Gemma returned no text.";
      const picoMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        text: finalText,
      };

      setMessages(previous =>
        previous
          .filter(message => message.role !== "typing")
          .concat(picoMessage)
      );
    } catch (err) {
      Alert.alert("Gemma error", String(err));
      setMessages(previous => previous.filter(message => message.role !== "typing"));
    } finally {
      setGemmaLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
    style={styles.container}
    behavior={
      Platform.OS === "ios"
        ? "padding"
        : "height"
    }
  >
      <MeshBackground />

      {/* top-right hamburger with the native-tool buttons */}
      <ToolMenu onToolResult={pushToolMenuResult} />

      {messages.length === 0 ? (
        <Welcome />
      ) : (
        <View style={styles.chatArea}>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              if (item.role === "typing") {
                return <TypingIndicator />;
              }

              return (
                <MessageBubble message={item} />
              );
            }}
            contentContainerStyle={{
              paddingTop: 40,
              paddingBottom: 20,
            }}
          />
        </View>
      )}

      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        onAddPress={() => setModelPickerOpen(true)}
      />

      <ModelPickerSheet
        visible={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    backgroundColor: "#131314",
  },
  chatArea: {
    flex: 1,
    width: "90%",
  },
});
