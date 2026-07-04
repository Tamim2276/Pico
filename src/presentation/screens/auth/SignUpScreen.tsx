import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@shared/constants/data";

interface Props {
  navigation: any;
}

export default function SignUpScreen({ navigation }: Props) {
  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  // Handle form submission
  const handleSubmit = () => {
    if (agree) {
      navigation.replace("MainTabs");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status bar: dark content for light background */}
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Background glow circles */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      {/* Keyboard-aware scroll view */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Splash");
              }
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          {/* Header: logo and title */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>✦</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Pico today</Text>
          </View>

          {/* Form fields */}
          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={COLORS.textHint}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="name@company.com"
              placeholderTextColor={COLORS.textHint}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textHint}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            {/* Toggle password visibility */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.inputIcon}>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🛡️</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textHint}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.checkboxRow}
            onPress={() => setAgree(!agree)}
          >
            {/* Checkbox */}
            <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
              {agree && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the{" "}
              <Text style={styles.checkboxLink}>Terms of Service</Text> and{" "}
              <Text style={styles.checkboxLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Submit button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.submitButton, !agree && styles.submitButtonDisabled]}
            onPress={handleSubmit}
          >
            <Text
              style={[
                styles.submitButtonText,
                !agree && styles.submitButtonTextDisabled,
              ]}
            >
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Divider: OR JOIN WITH */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR JOIN WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social login buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.socialButton}
              onPress={() => navigation.replace("MainTabs")}
            >
              <Text style={styles.socialText}>G Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.socialButton}
              onPress={() => navigation.replace("MainTabs")}
            >
              <Text style={styles.socialText}> Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Footer: login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  glowTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0,191,166,0.05)",
  },

  glowBottomLeft: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(38,34,119,0.08)",
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },

  backButtonText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
  },

  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  logoIcon: {
    fontSize: 28,
    color: COLORS.surface,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textHint,
  },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
  },

  inputIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    marginBottom: 20,
    gap: 10,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  checkmark: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: "bold",
  },

  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textHint,
    lineHeight: 18,
  },

  checkboxLink: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  submitButtonDisabled: {
    backgroundColor: COLORS.divider,
    shadowOpacity: 0,
    elevation: 0,
  },

  submitButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: "bold",
  },

  submitButtonTextDisabled: {
    color: COLORS.textHint,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },

  dividerText: {
    marginHorizontal: 12,
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.textHint,
    letterSpacing: 1.5,
  },

  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  socialButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  socialText: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textSecondary,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  footerText: {
    fontSize: 13,
    color: COLORS.textHint,
  },

  footerLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "bold",
  },
});

//checking
