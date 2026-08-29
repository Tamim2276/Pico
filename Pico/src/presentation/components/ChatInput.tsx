import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;

  onSend: () => void;

  placeholder?: string;

  onAddPress?: () => void;
  onMicPress?: () => void;
}

export default function ChatInput({
  value,
  onChangeText,
  onSend,

  placeholder = "Ask Pico ...",

  onAddPress,
  onMicPress,
}: ChatInputProps) {
  return (
    <View style={styles.container}>
      {/* <TouchableOpacity onPress={onAddPress} style={styles.iconButton}>
        <Ionicons name="add" size={26} color="#C4C7C5" />
      </TouchableOpacity> */}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSend}
        placeholder={placeholder}
        placeholderTextColor="#A3A3A3"
        style={styles.input}
      />

      {/* <TouchableOpacity
        onPress={onMicPress}
        style={styles.iconButton}
      >
        <MaterialCommunityIcons
          name="microphone-outline"
          size={24}
          color="#E5E5E5"
        />
      </TouchableOpacity> */}

      <TouchableOpacity onPress={onAddPress} style={styles.iconButton}>
        <Ionicons name="add" size={26} color="#C4C7C5" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: "#1E1F20",
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,

    width: "90%",
  },

  iconButton: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    flex: 1,
    color: "#E3E3E3",
    fontSize: 16,
    marginLeft: 4,
    paddingVertical: 0,
  },
});