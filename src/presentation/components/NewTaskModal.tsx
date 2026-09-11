import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@presentation/context/ThemeContext";
import { useTasks } from "@presentation/context/TaskContext";
import type { Priority } from "@domain/entities/Task";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PRIORITIES: Priority[] = ["Low", "Medium", "High"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const DUE_OPTIONS: { label: string; getDate: () => string | undefined }[] = [
  { label: "None", getDate: () => undefined },
  { label: "Today", getDate: () => startOfDay(new Date()).toISOString() },
  {
    label: "Tomorrow",
    getDate: () => {
      const d = startOfDay(new Date());
      d.setDate(d.getDate() + 1);
      return d.toISOString();
    },
  },
  {
    label: "In 3 days",
    getDate: () => {
      const d = startOfDay(new Date());
      d.setDate(d.getDate() + 3);
      return d.toISOString();
    },
  },
  {
    label: "In 1 week",
    getDate: () => {
      const d = startOfDay(new Date());
      d.setDate(d.getDate() + 7);
      return d.toISOString();
    },
  },
];

export default function NewTaskModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { createTask } = useTasks();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [category, setCategory] = useState("General");
  const [dueIndex, setDueIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setCategory("General");
    setDueIndex(0);
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Add a title", "Please give your task a name.");
      return;
    }
    setSaving(true);
    try {
      await createTask(
        title.trim(),
        priority,
        category.trim() || "General",
        description.trim() || undefined,
        DUE_OPTIONS[dueIndex].getDate()
      );
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>New Task</Text>
            <TouchableOpacity
              onPress={close}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Review Q4 report"
              placeholderTextColor={colors.textHint}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map((p) => {
                const active = p === priority;
                return (
                  <TouchableOpacity
                    key={p}
                    activeOpacity={0.7}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kitchen, Work, Personal"
              placeholderTextColor={colors.textHint}
              value={category}
              onChangeText={setCategory}
            />

            <Text style={styles.fieldLabel}>Due</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {DUE_OPTIONS.map((d, i) => {
                const active = i === dueIndex;
                return (
                  <TouchableOpacity
                    key={d.label}
                    activeOpacity={0.7}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDueIndex(i)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Add details…"
              placeholderTextColor={colors.textHint}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Add Task</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 28,
      paddingTop: 10,
      maxHeight: "88%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.divider,
      marginBottom: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    title: { fontSize: 20, fontWeight: "bold", color: colors.textPrimary },
    closeIcon: { fontSize: 18, color: colors.textHint, fontWeight: "600" },

    fieldLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginTop: 16,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },
    notesInput: { minHeight: 70, textAlignVertical: "top" },

    chipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    chipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
    chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    chipTextActive: { color: "#FFFFFF" },

    saveButton: {
      marginTop: 24,
      backgroundColor: colors.primaryDark,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
    },
    saveButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
  });
