import React, { useMemo, useState } from "react";
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
import { createEvent, ensureCalendarPermission } from "@data/calendar/deviceCalendar";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const DURATIONS = [30, 60, 90, 120];
const MINUTES = [0, 15, 30, 45];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayChips(): { label: string; date: Date }[] {
  const out: { label: string; date: Date }[] = [];
  const base = startOfDay(new Date());
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const label =
      i === 0
        ? "Today"
        : i === 1
        ? "Tomorrow"
        : d.toLocaleDateString([], { weekday: "short", day: "numeric" });
    out.push({ label, date: d });
  }
  return out;
}

export default function AddTaskModal({ visible, onClose, onCreated }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const chips = useMemo(dayChips, [visible]);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  const [hour, setHour] = useState(Math.min(new Date().getHours() + 1, 23));
  const [minute, setMinute] = useState(0);
  const [duration, setDuration] = useState(60);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setNotes("");
    setDayIndex(0);
    setHour(Math.min(new Date().getHours() + 1, 23));
    setMinute(0);
    setDuration(60);
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
      const granted = await ensureCalendarPermission();
      if (!granted) {
        Alert.alert(
          "Calendar access needed",
          "Allow calendar access so Pico can save this to your phone's calendar."
        );
        setSaving(false);
        return;
      }

      const start = new Date(chips[dayIndex].date);
      start.setHours(hour, minute, 0, 0);

      await createEvent({
        title: title.trim(),
        start,
        durationMinutes: duration,
        notes: notes.trim() || undefined,
      });

      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const pad = (n: number) => n.toString().padStart(2, "0");

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

            <Text style={styles.fieldLabel}>Day</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {chips.map((c, i) => {
                const active = i === dayIndex;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDayIndex(i)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Time</Text>
            <View style={styles.timeRow}>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setHour((h) => (h + 23) % 24)}
                >
                  <Text style={styles.stepperIcon}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{pad(hour)}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setHour((h) => (h + 1) % 24)}
                >
                  <Text style={styles.stepperIcon}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.timeColon}>:</Text>

              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() =>
                    setMinute(
                      (m) =>
                        MINUTES[(MINUTES.indexOf(m) + MINUTES.length - 1) % MINUTES.length]
                    )
                  }
                >
                  <Text style={styles.stepperIcon}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{pad(minute)}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() =>
                    setMinute((m) => MINUTES[(MINUTES.indexOf(m) + 1) % MINUTES.length])
                  }
                >
                  <Text style={styles.stepperIcon}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Duration</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => {
                const active = d === duration;
                return (
                  <TouchableOpacity
                    key={d}
                    activeOpacity={0.7}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDuration(d)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {d < 60 ? `${d}m` : `${d / 60}h`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Add details…"
              placeholderTextColor={colors.textHint}
              value={notes}
              onChangeText={setNotes}
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
                <Text style={styles.saveButtonText}>Add to Calendar</Text>
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

    timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    stepperButton: { paddingHorizontal: 16, paddingVertical: 10 },
    stepperIcon: { fontSize: 18, color: colors.primary, fontWeight: "700" },
    stepperValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      minWidth: 34,
      textAlign: "center",
    },
    timeColon: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },

    saveButton: {
      marginTop: 24,
      backgroundColor: colors.primaryDark,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
    },
    saveButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
  });
