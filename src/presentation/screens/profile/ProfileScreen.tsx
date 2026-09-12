import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Share,
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
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@presentation/context/ThemeContext";
import { useAuth } from "@presentation/context/AuthContext";
import {
  eraseAllLocalData,
  exportLocalData,
} from "@data/local/localDataManager";

const PRIVACY_TEXT =
  "Pico keeps your data on your device, we don't run our own servers, and we don't store, process, or share your information.\n\nSome features need the internet (like weather, search, maps, or Telegram), and anything you send through those features is covered by that service's own privacy policy.";

const ABOUT_URL = "https://github.com/Tamim2276/Pico";

const SUPPORT_EMAIL = "starfish-clutter04@bravealias.com";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Pico Help")}`;

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const styles = createStyles(colors);
  const [helpVisible, setHelpVisible] = useState(false);

  const handleAbout = async () => {
    try {
      const supported = await Linking.canOpenURL(ABOUT_URL);
      if (!supported) {
        Alert.alert("Couldn't open link", ABOUT_URL);
        return;
      }
      await Linking.openURL(ABOUT_URL);
    } catch {
      Alert.alert("Couldn't open link", ABOUT_URL);
    }
  };

  const handleHelp = () => {
    setHelpVisible(true);
  };

  const handleShareEmail = async () => {
    try {
      await Share.share({ message: SUPPORT_EMAIL });
    } catch {
      Alert.alert("Couldn't share email", SUPPORT_EMAIL);
    }
  };

  const handleOpenMailApp = async () => {
    try {
      const supported = await Linking.canOpenURL(SUPPORT_MAILTO);
      if (!supported) {
        Alert.alert("Couldn't open mail app");
        return;
      }
      await Linking.openURL(SUPPORT_MAILTO);
    } catch {
      Alert.alert("Couldn't open mail app");
    }
  };

  const handleDownloadData = async () => {
    try {
      const data = await exportLocalData();
      await Share.share({
        message: JSON.stringify(data, null, 2),
        title: "Pico data export",
      });
    } catch {
      Alert.alert(
        "Couldn't export data",
        "Something went wrong. Please try again."
      );
    }
  };

  const handleDeleteData = () => {
    Alert.alert(
      "Delete all data?",
      "This erases your tasks, events, reminders, Telegram sync state, accounts, and logs you out. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: async () => {
            try {
              await eraseAllLocalData();
              await logout();
            } catch {
              Alert.alert(
                "Couldn't delete data",
                "Something went wrong. Please try again."
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleAccountSecurity = () => {
    Alert.alert(
      "Account Security",
      "Your data stays on this device.",
      [
        { text: "Download my data", onPress: handleDownloadData },
        {
          text: "Delete all data…",
          style: "destructive",
          onPress: handleDeleteData,
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

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
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.bellButton}
          onPress={() => navigation.navigate("Notifications")}
        >
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
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} style={styles.editBadge}>
              <Text style={styles.editBadgeText}>✎</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{user?.fullName || "User"}</Text>
          <Text style={styles.email}>{user?.email || ""}</Text>
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
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={() => Alert.alert("Privacy", PRIVACY_TEXT)}
          >
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>🛡️</Text>
            </View>
            <Text style={styles.rowLabel}>Privacy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={handleAccountSecurity}
            accessibilityRole="button"
            accessibilityLabel="Account Security, download or delete data"
          >
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
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={handleAbout}
            accessibilityRole="link"
            accessibilityLabel="About, opens Pico GitHub page"
          >
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>ℹ️</Text>
            </View>
            <Text style={styles.rowLabel}>About</Text>
            <Text style={styles.rowMeta}>v1.0.0</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={handleHelp}
            accessibilityRole="link"
            accessibilityLabel="Help, contact support by email"
          >
            <View style={styles.rowIconWrap}>
              <Text style={styles.rowIcon}>❓</Text>
            </View>
            <Text style={styles.rowLabel}>Help</Text>
            <Text style={styles.externalIcon}>⤴</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.signOutButton}
          onPress={logout}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={helpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpVisible(false)}
      >
        <View style={styles.helpOverlay}>
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>Need help?</Text>
            <Text style={styles.helpText}>Reach out to us at:</Text>
            <View style={styles.emailBlock}>
              <Text style={styles.emailText} selectable>
                {SUPPORT_EMAIL}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.copyButton}
                onPress={handleShareEmail}
                accessibilityRole="button"
                accessibilityLabel="Copy support email"
              >
                <Text style={styles.copyButtonText}>⧉</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.helpActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.helpPrimaryButton}
                onPress={handleOpenMailApp}
              >
                <Text style={styles.helpPrimaryButtonText}>Open mail app</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.helpSecondaryButton}
                onPress={() => setHelpVisible(false)}
              >
                <Text style={styles.helpSecondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

    helpOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },

    helpCard: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 22,
    },

    helpTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 6,
    },

    helpText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },

    emailBlock: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 18,
      gap: 10,
    },

    emailText: {
      flex: 1,
      fontSize: 13,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      color: colors.textPrimary,
    },

    copyButton: {
      backgroundColor: colors.primaryDark,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },

    copyButtonText: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#FFFFFF",
    },

    helpActions: {
      flexDirection: "row",
      gap: 10,
    },

    helpPrimaryButton: {
      flex: 1,
      backgroundColor: colors.primaryDark,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },

    helpPrimaryButtonText: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#FFFFFF",
    },

    helpSecondaryButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.divider,
    },

    helpSecondaryButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
  });
