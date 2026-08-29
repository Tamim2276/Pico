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
import TypingIndicator from "@presentation/components/TypingIndicator";
import { rescheduleBus } from "@data/notifications/rescheduleBus";
import { useTasks } from "@presentation/context/TaskContext";
import { matchIntent, runTool } from "@data/tools/dispatcher";


type Message = {
  id: string;
  role: "user" | "assistant" | "typing";
  text: string;
};

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
  "- If the user is chatting, greeting, or asking general questions (e.g. 'Hi', 'Who are you', 'What is today'), reply naturally in plain text. NEVER output JSON for general conversation.",
  "- ONLY emit JSON when the user specifically requests an action (create task, schedule event, set timer, turn on light, daily briefing).",
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
  const { tasks } = useTasks();

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({
        animated: true,
      });
    }
  }, [messages]);

  // Push a message from Pico into the chat (used by the tools menu).
  const pushAssistantMessage = (text: string) => {
    setMessages(previous =>
      previous.concat({
        id: `${Date.now().toString()}-tool`,
        role: "assistant",
        text,
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

    // 1. Layer 1 Fast-Path Router (0ms response for unambiguous commands & greetings)
    const fastCall = matchIntent(text);
    if (fastCall) {
      setInputText("");
      const responseText = fastCall.directMessage
        ? fastCall.directMessage
        : (await runTool(fastCall.name, fastCall.args)).message;

      setMessages(prev => [
        ...prev,
        userMessage,
        {
          id: `${baseId}-pico`,
          role: "assistant",
          text: responseText,
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
        };

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
      <ToolMenu onToolResult={pushAssistantMessage} />

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
