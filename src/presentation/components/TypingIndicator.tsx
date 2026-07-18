import { View, Text, StyleSheet } from "react-native";


export default function TypingIndicator() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Pico is thinking...
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    backgroundColor: "#303030",
    padding: 12,
    borderRadius: 18,
    marginVertical: 6,
  },

  text: {
    color: "#AAAAAA",
    fontSize: 16,
    fontStyle: "italic",
  },
});