import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Switch,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@shared/constants/data";
import { useAppState } from "@presentation/hooks/useAppState";

interface Props {
  navigation: any;
}

export default function ProfileScreen({ navigation }: Props) {
  const { profile, setProfile } = useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email);

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handleSave = () => {
    if (editName.trim() && editEmail.trim()) {
      setProfile((prev) => ({ ...prev, name: editName.trim(), email: editEmail.trim() }));
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Top app bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>✦</Text>
          <Text style={styles.headerTitle}>Pico</Text>
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
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.editAvatarBtn}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Text style={styles.editAvatarIcon}>{isEditing ? "✕" : "✎"}</Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor={COLORS.textHint}
                style={styles.input}
              />
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email"
                placeholderTextColor={COLORS.textHint}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              <View style={styles.editFormActions}>
                <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} onPress={handleCancel}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>✓ Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: "center" }}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
            </View>
          )}
        </View>

        {/* System Preferences */}
        <Text style={styles.sectionLabel}>System Preferences</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBordered]}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIconWrap}>
                <Text style={styles.rowEmoji}>🌙</Text>
              </View>
              <Text style={styles.rowLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={profile.darkMode}
              onValueChange={(v) => setProfile((prev) => ({ ...prev, darkMode: v }))}
              trackColor={{ false: COLORS.divider, true: COLORS.accent }}
              thumbColor={COLORS.surface}
            />
          </View>
          <View style={[styles.row, styles.rowBordered]}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIconWrap}>
                <Text style={styles.rowEmoji}>🔔</Text>
              </View>
              <Text style={styles.rowLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={profile.pushNotifications}
              onValueChange={(v) => setProfile((prev) => ({ ...prev, pushNotifications: v }))}
              trackColor={{ false: COLORS.divider, true: COLORS.accent }}
              thumbColor={COLORS.surface}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIconWrap}>
                <Text style={styles.rowEmoji}>⏰</Text>
              </View>
              <Text style={styles.rowLabel}>Reminder Alerts</Text>
            </View>
            <Switch
              value={profile.reminderAlerts}
              onValueChange={(v) => setProfile((prev) => ({ ...prev, reminderAlerts: v }))}
              trackColor={{ false: COLORS.divider, true: COLORS.accent }}
              thumbColor={COLORS.surface}
            />
          </View>
        </View>

        {/* Security */}
        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.card}>
          <TouchableOpacity activeOpacity={0.7} style={[styles.row, styles.rowBordered]}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIconWrap}>
                <Text style={styles.rowEmoji}>👁️</Text>
              </View>
              <Text style={styles.rowLabel}>Privacy</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIconWrap}>
                <Text style={styles.rowEmoji}>🛡️</Text>
              </View>
              <Text style={styles.rowLabel}>Account Security</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBordered]}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIconWrap}>
                <Text style={styles.rowEmoji}>ℹ️</Text>
              </View>
              <View>
                <Text style={styles.rowLabel}>About</Text>
                <Text style={styles.aboutVersion}>v1.0.0</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.row}
            onPress={() => Linking.openURL("https://ai.studio/build")}
          >
            <View style={styles.rowLeft}>
              <View style={styles.rowIconWrap}>
                <Text style={styles.rowEmoji}>❓</Text>
              </View>
              <Text style={styles.rowLabel}>Help</Text>
            </View>
            <Text style={styles.chevron}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.signOutBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "Splash" }] })}
        >
          <Text style={styles.signOutText}>⎋ Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLogo: { fontSize: 18, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.primary },
  bellButton: { padding: 8 },
  bellIcon: { fontSize: 18 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  heroSection: { alignItems: "center", paddingVertical: 16, marginBottom: 16 },
  avatarWrap: { marginBottom: 16 },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 28, fontWeight: "bold", color: COLORS.surface },
  editAvatarBtn: {
    position: "absolute",
    bottom: 2,
    right: -2,
    backgroundColor: COLORS.accent,
    padding: 8,
    borderRadius: 20,
  },
  editAvatarIcon: { fontSize: 14, color: COLORS.surface, fontWeight: "bold" },

  editForm: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.inputBg,
    gap: 12,
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  editFormActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingTop: 4 },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.divider,
  },
  cancelBtnText: { fontSize: 12, fontWeight: "bold", color: COLORS.textSecondary },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: { fontSize: 12, fontWeight: "bold", color: COLORS.surface },

  profileName: { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },
  profileEmail: { fontSize: 12, fontWeight: "600", color: COLORS.textHint, marginTop: 4 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  rowBordered: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowEmoji: { fontSize: 16 },
  rowLabel: { fontSize: 14, fontWeight: "bold", color: COLORS.textPrimary },
  aboutVersion: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textHint,
    marginTop: 2,
    textTransform: "uppercase",
  },
  chevron: { fontSize: 18, color: COLORS.textHint },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.error,
    marginTop: 8,
  },
  signOutText: { fontSize: 15, fontWeight: "bold", color: COLORS.error },
});
