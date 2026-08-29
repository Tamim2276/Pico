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
import { handleUserMessage } from "@shared/utils/assistant/pipeline";
import AddTaskModal from "@presentation/components/AddTaskModal";

import ChatInput from "../../components/ChatInput";
import MeshBackground from "../../components/MeshBackground2";
import ToolMenu from "@presentation/components/ToolMenu";
import ModelPickerSheet from "@presentation/components/ModelPickerSheet";
import Welcome from "@presentation/components/Welcome";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "@presentation/components/TypingIndicator";
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

export function AssistantScreen() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [gemmaLoading, setGemmaLoading] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<{ title: string; notes: string }>({
    title: "",
    notes: "",
  });

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
      // First: our reliable intents (weather / add-task / reschedule).
      const action = await handleUserMessage(text);

      let finalText: string;

      if (action.type === "text") {
        finalText = action.text;
      } else if (action.type === "open_add_task") {
        setTaskDraft({ title: action.title, notes: action.details });
        setAddTaskOpen(true);
        finalText = `Sure — I've drafted "${action.title}". Pick a time and tap Add to save it to your calendar.`;
      } else {
        // Fallback: existing Gemma tool-aware path + plain chat.
        const provider = createLLMProvider();
        const result = await provider.generate(buildToolAwarePrompt(text));
        const raw = typeof result === "string" ? result : JSON.stringify(result);

        const toolCall = parseToolCallFromGemma(raw);
        if (toolCall) {
          const toolResult = await executeToolCallFromGemma(raw);
          finalText = toolResult.message || "Tool finished.";
        } else {
          const cleaned = sanitizeGemmaOutput(raw);
          finalText = cleaned.trim() || raw.trim() || "Gemma returned no text.";
        }
      }

      const picoMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        text: finalText,
      };
      setMessages(previous =>
        previous.filter(message => message.role !== "typing").concat(picoMessage)
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
        initialTitle={taskDraft.title}
        initialNotes={taskDraft.notes}
        onClose={() => setAddTaskOpen(false)}
        onCreated={() => {
          setAddTaskOpen(false);
          pushAssistantMessage("Added it to your calendar. ✅");
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
