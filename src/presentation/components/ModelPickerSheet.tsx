import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  AVAILABLE_MODELS,
  isModelDownloaded,
  type ModelCatalogEntry,
} from "@shared/utils/llm";

interface ModelPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

type RowState =
  | { status: "checking" }
  | { status: "idle" }
  | { status: "downloading"; percent: number }
  | { status: "downloaded" };

const ICON_COLOR = "#E3E3E3";

export default function ModelPickerSheet({
  visible,
  onClose,
}: ModelPickerSheetProps) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const checkAll = async () => {
      const initial: Record<string, RowState> = {};
      AVAILABLE_MODELS.forEach(entry => {
        initial[entry.id] = { status: "checking" };
      });
      setRowStates(initial);

      for (const entry of AVAILABLE_MODELS) {
        try {
          const downloaded = await isModelDownloaded(entry.fileName);
          if (cancelled) return;
          setRowStates(previous => ({
            ...previous,
            [entry.id]: {
              status: downloaded ? "downloaded" : "idle",
            },
          }));
        } catch {
          if (cancelled) return;
          setRowStates(previous => ({
            ...previous,
            [entry.id]: { status: "idle" },
          }));
        }
      }
    };

    checkAll();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const startDownload = (entry: ModelCatalogEntry) => {
    // Real RNFS download lands in the next stage; visual-only for now.
    console.log(`[Models] Download requested for: ${entry.displayName}`);
    setRowStates(previous => ({
      ...previous,
      [entry.id]: { status: "downloading", percent: 0 },
    }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Models</Text>

          {AVAILABLE_MODELS.length === 0 ? (
            <Text style={styles.emptyText}>No models available yet.</Text>
          ) : (
            AVAILABLE_MODELS.map(entry => {
              const state = rowStates[entry.id] ?? { status: "checking" };
              return (
                <View key={entry.id} style={styles.item}>
                  <Text style={styles.itemLabel}>{entry.displayName}</Text>

                  {state.status === "checking" && (
                    <ActivityIndicator size="small" color={ICON_COLOR} />
                  )}

                  {state.status === "idle" && (
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => startDownload(entry)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="cloud-download-outline"
                        size={22}
                        color={ICON_COLOR}
                      />
                    </TouchableOpacity>
                  )}

                  {state.status === "downloading" && (
                    <View style={styles.progressRow}>
                      <ActivityIndicator size="small" color={ICON_COLOR} />
                      <Text style={styles.percentText}>
                        {state.percent}%
                      </Text>
                    </View>
                  )}

                  {state.status === "downloaded" && (
                    <Ionicons name="checkmark" size={24} color="#34A853" />
                  )}
                </View>
              );
            })
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  sheet: {
    backgroundColor: "#1E1F20",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "85%",
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  sheetTitle: {
    color: "#A3A3A3",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingBottom: 8,
  },

  emptyText: {
    color: "#A3A3A3",
    fontSize: 15,
    textAlign: "center",
    paddingVertical: 24,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },

  itemLabel: {
    color: "#E3E3E3",
    fontSize: 15,
    flex: 1,
  },

  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2A2B2C",
    alignItems: "center",
    justifyContent: "center",
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 72,
    justifyContent: "flex-end",
  },

  percentText: {
    color: ICON_COLOR,
    fontSize: 14,
    minWidth: 36,
    textAlign: "right",
  },
});
