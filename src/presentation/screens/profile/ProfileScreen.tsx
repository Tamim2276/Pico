import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@presentation/context/ThemeContext";

export default function ProfileScreen() {
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>🧭</Text>
          </View>
          <Text style={styles.brandTitle}>Pico</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.bellButton}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + identity */}
        <View style={styles.identityWrap}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AJ</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.editBadge}>
              <Text style={styles.editBadgeText}>✎</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>Alex Johnson</Text>
          <Text style={styles.email}>alex.johnson@pico-ai.com</Text>
        </View>

        {/* System Preferences */}
        <Text style={styles.sectionLabel}>SYSTEM PREFERENCES</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>🌙</Text>
            </View>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.divider, true: colors.accent }}
              thumbColor={
                Platform.OS === "android" ? colors.surface : undefined
              }
            />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity activeOpacity={0.7} style={styles.row}>
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>🔔</Text>
            </View>
            <Text style={styles.rowLabel}>Notifications</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Security */}
        <Text style={styles.sectionLabel}>SECURITY</Text>
        <View style={styles.card}>
          <TouchableOpacity activeOpacity={0.7} style={styles.row}>
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>🛡️</Text>
            </View>
            <Text style={styles.rowLabel}>Privacy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity activeOpacity={0.7} style={styles.row}>
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>🔒</Text>
            </View>
            <Text style={styles.rowLabel}>Account Security</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.card}>
          <TouchableOpacity activeOpacity={0.7} style={styles.row}>
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>ℹ️</Text>
            </View>
            <Text style={styles.rowLabel}>About</Text>
            <Text style={styles.rowMeta}>v1.0.0</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity activeOpacity={0.7} style={styles.row}>
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>❓</Text>
            </View>
            <Text style={styles.rowLabel}>Help</Text>
            <Text style={styles.externalIcon}>⤴</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity activeOpacity={0.7} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 8,
    },

    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    brandIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    brandIconText: {
      fontSize: 12,
    },

    brandTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
    },

    bellButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },

    bellIcon: {
      fontSize: 18,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    identityWrap: {
      alignItems: "center",
      marginTop: 12,
      marginBottom: 28,
    },

    avatarWrap: {
      marginBottom: 14,
    },

    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },

    avatarText: {
      fontSize: 26,
      fontWeight: "bold",
      color: "#FFFFFF",
    },

    editBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.background,
    },

    editBadgeText: {
      fontSize: 12,
      color: "#FFFFFF",
    },

    name: {
      fontSize: 19,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 4,
    },

    email: {
      fontSize: 13,
      color: colors.textHint,
    },

    sectionLabel: {
      fontSize: 12,
      fontWeight: "bold",
      letterSpacing: 0.6,
      color: colors.primary,
      marginBottom: 10,
      marginTop: 4,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      marginBottom: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
    },

    rowIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },

    rowIcon: {
      fontSize: 15,
    },

    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: "500",
      color: colors.textPrimary,
    },

    rowMeta: {
      fontSize: 13,
      color: colors.textHint,
      marginRight: 8,
    },

    chevron: {
      fontSize: 20,
      color: colors.textHint,
    },

    externalIcon: {
      fontSize: 15,
      color: colors.textHint,
    },

    divider: {
      height: 1,
      backgroundColor: colors.divider,
    },

    signOutButton: {
      borderWidth: 1.5,
      borderColor: colors.error,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      backgroundColor: colors.surface,
    },

    signOutText: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.error,
    },
  });
