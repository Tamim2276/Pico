import { View, StyleSheet, FlatList } from "react-native";
import React, { useState } from "react";

import ChatInput from "../../components/ChatInput";
import MeshBackground from "../../components/MeshBackground2";
import Welcome from "@presentation/components/Welcome";
import MessageBubble from "../../components/MessageBubble";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export function AssistantScreen() {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      role: "user",
      text: inputText,
    };

    const picoMessage: Message = {
      role: "assistant",
      text: "I am still asleep, go away. 😴",
    };

    setMessages(previous => [
        ...previous,
        userMessage,
        picoMessage,
    ]);

    setInputText("");
  };

  return (
    <View style={styles.container}>
      <MeshBackground />

      {messages.length === 0 ? (
        <Welcome />
      ) : (
        <View style={styles.chatArea}>
          
          <FlatList
              data={messages}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                  <MessageBubble message={item} />
              )}

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
    </View>
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
    flex: 1,
    backgroundColor: "#131314",
  },
  chatArea: {
    flex: 1,
    width: "90%",
  },
});
