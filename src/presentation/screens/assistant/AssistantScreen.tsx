import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@shared/constants/data";

// Not part of the requested conversion — a minimal, on-brand placeholder
// so tab navigation has a valid destination. Only Home and Profile were
// requested to be fully built out.
export default function AssistantScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>🎙️</Text>
      </View>
      <Text style={styles.title}>Assistant</Text>
      <Text style={styles.note}>
        This screen was not part of the requested conversion — placeholder only.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  icon: { fontSize: 28 },
  title: { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 8 },
  note: {
    fontSize: 12,
    color: COLORS.textHint,
    textAlign: "center",
    lineHeight: 18,
  },
});
