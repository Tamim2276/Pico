import React from "react";
import {
  View,
  Text,
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
  placeholder?: string;
  model?: string;
  onAddPress?: () => void;
  onMicPress?: () => void;
  onModelPress?: () => void;
}

export default function ChatInput({
  value,
  onChangeText,
  placeholder = "Ask Pico ...",
  model = "Gemma",
  onAddPress,
  onMicPress,
  onModelPress,
}: ChatInputProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onAddPress} style={styles.iconButton}>
        <Ionicons name="add" size={26} color="#C4C7C5" />
      </TouchableOpacity>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A3A3A3"
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.modelButton}
        onPress={onModelPress}
      >
        <Text style={styles.modelText}>{model}</Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color="#D4D4D4"
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onMicPress}
        style={styles.iconButton}
      >
        <MaterialCommunityIcons
          name="microphone-outline"
          size={24}
          color="#E5E5E5"
        />
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

  modelButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 2,
  },

  modelText: {
    color: "#E3E3E3",
    fontSize: 16,
    fontWeight: "500",
  },
});