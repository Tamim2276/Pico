import { View, Text, StyleSheet } from "react-native";

type Message = {
  role: "user" | "assistant";
  text: string;
};

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({
  message,
}: MessageBubbleProps) {

  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.picoContainer,
      ]}
    >
      <Text style={styles.text}>
        {message.text}
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({

  container: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 18,
    marginVertical: 6,
  },

  userContainer: {
    alignSelf: "flex-end",
    backgroundColor: "#2F80ED",
  },

  picoContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#303030",
  },

  text: {
    color: "#FFFFFF",
    fontSize: 16,
  },

});