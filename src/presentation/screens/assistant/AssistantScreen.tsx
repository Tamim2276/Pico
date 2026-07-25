import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";

import { testGemma } from "../../../shared/utils/llm";

import ChatInput from "../../components/ChatInput";
import MeshBackground from "../../components/MeshBackground2";
import Welcome from "@presentation/components/Welcome";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "@presentation/components/TypingIndicator";


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

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: inputText,
    };

    setMessages(previous => [
        ...previous,
        userMessage,
        {
            id: Date.now().toString(),
            role: "typing",
            text: "",
        },
    ]);

    setInputText("");
    
    // dummy delay to simulate Pico's response
    await new Promise(resolve =>
      setTimeout(resolve, 1000)
    );

    const picoMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      text: "I am still asleep, go away. 😴",
    };

    setMessages(previous =>
      previous
        .filter(message => message.role !== "typing")
        .concat(picoMessage)
    );
  };

  const handleRunGemma = async () => {
    if (gemmaLoading) return;
    setGemmaLoading(true);
    // show typing indicator
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'typing', text: '' },
    ]);

    try {
      const result = await testGemma();

      const raw = typeof result === 'string' ? result : JSON.stringify(result);
      const cleaned = sanitizeGemmaOutput(raw);
      const picoMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        text: cleaned,
      };

      setMessages(previous =>
        previous
          .filter(message => message.role !== "typing")
          .concat(picoMessage)
      );
    } catch (err) {
      Alert.alert('Gemma error', String(err));
      setMessages(previous => previous.filter(message => message.role !== 'typing'));
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

      <View style={{ width: '90%', padding: 8 }}>
        <Button
          title={gemmaLoading ? 'Running…' : 'Run Gemma'}
          onPress={handleRunGemma}
          disabled={gemmaLoading}
        />
        {gemmaLoading && <ActivityIndicator style={{ marginTop: 8 }} />}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // container: {
  //   height: "100%",
  //   width: "100%",
  //   backgroundColor: "#131314",

  //   display: "flex",
  //   flexDirection: "column",
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
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
