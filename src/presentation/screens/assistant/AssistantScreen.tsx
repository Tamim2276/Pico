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
import AddTaskModal from "@presentation/components/AddTaskModal";
import { rescheduleBus } from "@data/notifications/rescheduleBus";


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

const buildToolAwarePrompt = (userText: string) => [
  "You are Pico.",
  // "Reply normally unless a tool is clearly needed.",
  // "Use a tool ONLY when the user asks you to perform an available tool action.",
  // "Do NOT use a tool for greetings, casual chat, explanations, or questions you can answer yourself.",
  'Tool call format: <start_function_call>{"name":"TOOL","args":{}}<escape>',
  // "Output only the tool call when using a tool.",
  // "Available tools:",
   JSON.stringify(toolList),
  "",
  `User: ${userText}`,
].join("\n");


// Detect an "add task" request and pull a rough title out of it. Deterministic
// (no LLM), so it can't hallucinate — the user confirms/edits in the modal.
const looksLikeAddTask = (text: string): boolean => {
  const t = text.toLowerCase();
  return (
    /\b(add|create|new|schedule|set up|make)\b[\s\S]*\b(task|event|reminder|appointment|meeting)\b/.test(t) ||
    /\bremind me to\b/.test(t) ||
    /\b(add|put|schedule)\b[\s\S]*\bcalendar\b/.test(t)
  );
};

const extractTaskTitle = (text: string): string => {
  let t = text.trim();
  t = t.replace(/^(hey )?pico[,\s]*/i, "");
  t = t.replace(/^(can you|could you|please)\s+/i, "");
  t = t.replace(/^(add|create|new|schedule|set up|make|remind me to)\s+/i, "");
  t = t.replace(/^(a|an|the)\s+/i, "");
  t = t.replace(/\s+(to|on|in)\s+(my\s+)?calendar\b/i, "");
  t = t.replace(/\s+\b(today|tonight|tomorrow)\b[\s\S]*$/i, "");
  t = t.replace(/\s+\bthis (morning|afternoon|evening)\b[\s\S]*$/i, "");
  t = t.replace(/\s+\bnext\s+\w+[\s\S]*$/i, "");
  t = t.replace(/\s+\bon\s+\w+day\b[\s\S]*$/i, "");
  t = t.replace(/\s+\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b[\s\S]*$/i, "");
  return t.trim() || "New task";
};

export function AssistantScreen() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [gemmaLoading, setGemmaLoading] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

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
      // Add-task intent: handle deterministically, open the calendar form.
      if (looksLikeAddTask(text)) {
        const title = extractTaskTitle(text);
        setTaskTitle(title);
        setAddTaskOpen(true);
        const picoMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          text: `Sure — I've started "${title}". Pick a time and tap Add to save it to your calendar.`,
        };
        setMessages(previous =>
          previous.filter(message => message.role !== "typing").concat(picoMessage)
        );
        return;
      }

      const provider = createLLMProvider();
      const result = await provider.generate(buildToolAwarePrompt(text));
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

      <AddTaskModal
        visible={addTaskOpen}
        initialTitle={taskTitle}
        onClose={() => setAddTaskOpen(false)}
        onCreated={() => {
          setAddTaskOpen(false);
          pushAssistantMessage("Added it to your calendar. \u2705");
        }}
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
