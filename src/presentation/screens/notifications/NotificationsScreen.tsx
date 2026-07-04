import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@shared/constants/data";
import { useAppState } from "@presentation/hooks/useAppState";

// Not part of the requested conversion, but rendered from real shared
// state (rather than a static placeholder) since Home links here.
export default function NotificationsScreen() {
  const { notifications } = useAppState();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.isNew && <View style={styles.dot} />}
            </View>
            <Text style={styles.cardDesc}>{item.description}</Text>
            <Text style={styles.cardTime}>{item.time}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 56,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: "bold", color: COLORS.textPrimary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  cardDesc: { fontSize: 12, color: COLORS.textHint, marginTop: 6, lineHeight: 17 },
  cardTime: { fontSize: 11, fontWeight: "600", color: COLORS.textHint, marginTop: 8 },
});
