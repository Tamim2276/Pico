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

const buildToolAwarePrompt = (userText: string) => {
  return [
    "You are Pico. Decide whether to call one tool.",
    "If the user request matches a tool, return ONLY the function call in this format:",
    '<start_function_call>{"name":"tool_name","args":{}}<escape>',
    "Do not output markdown, code fences, or any extra text.",
    "Never copy parameter schema fields into args.",
    "Do not output keys like type, properties, required inside args.",
    "Allowed examples:",
    '<start_function_call>{"name":"current_location","args":{}}<escape>',
    '<start_function_call>{"name":"battery_status","args":{}}<escape>',
    '<start_function_call>{"name":"read_calendar","args":{}}<escape>',
    '<start_function_call>{"name":"fire_notification","args":{}}<escape>',
    '<start_function_call>{"name":"toggle_flashlight","args":{"state":"on"}}<escape>',
    '<start_function_call>{"name":"toggle_flashlight","args":{"state":"off"}}<escape>',
    "If no tool is relevant, answer normally in plain text.",
    "Available tools:",
    JSON.stringify(toolList, null, 2),
    "",
    "User request:",
    userText,
  ].join("\n");
};

export function AssistantScreen() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [gemmaLoading, setGemmaLoading] = useState(false);

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
