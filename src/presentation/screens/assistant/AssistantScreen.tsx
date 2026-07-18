import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";

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

export function AssistantScreen() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

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
