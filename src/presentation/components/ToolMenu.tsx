import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { runTool } from "@data/tools/dispatcher";
import { torchStore } from "@data/device/torchStore";

interface ToolMenuProps {
  /** called with Pico's reply text after a tool runs */
  onToolResult: (text: string) => void;
}

type ActionKey = "flashlight" | "battery" | "calendar" | "location" | "notify" | "create_task" | "read_tasks";

interface MenuAction {
  key: ActionKey;
  label: string;
  icon: React.ReactNode;
  run: () => Promise<{ message: string }>;
}

const ICON_COLOR = "#E3E3E3";

const ACTIONS: MenuAction[] = [
  {
    key: "create_task",
    label: "Add Quick Task",
    icon: <Ionicons name="checkbox-outline" size={22} color={ICON_COLOR} />,
    run: () => runTool("create_task", { title: "Test task from Pico Assistant", priority: "High" }),
  },
  {
    key: "read_tasks",
    label: "My Tasks",
    icon: <Ionicons name="list-outline" size={22} color={ICON_COLOR} />,
    run: () => runTool("read_tasks"),
  },
  {
    key: "flashlight",
    label: "Flashlight",
    icon: <Ionicons name="flashlight-outline" size={22} color={ICON_COLOR} />,
    // one button toggles based on the live torch state
    run: () => runTool("toggle_flashlight", { state: torchStore.get() ? "off" : "on" }),
  },
  {
    key: "battery",
    label: "Battery status",
    icon: <MaterialCommunityIcons name="battery-70" size={22} color={ICON_COLOR} />,
    run: () => runTool("battery_status"),
  },
  {
    key: "calendar",
    label: "Upcoming events",
    icon: <Ionicons name="calendar-outline" size={22} color={ICON_COLOR} />,
    run: () => runTool("read_calendar"),
  },
  {
    key: "location",
    label: "My location",
    icon: <Ionicons name="location-outline" size={22} color={ICON_COLOR} />,
    run: () => runTool("current_location"),
  },
  {
    key: "notify",
    label: "Reschedule reminder",
    icon: <Ionicons name="notifications-outline" size={22} color={ICON_COLOR} />,
    run: () => runTool("fire_notification"),
  },
];

export default function ToolMenu({ onToolResult }: ToolMenuProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ActionKey | null>(null);

  const handlePress = async (action: MenuAction) => {
    if (busy) return;
    setBusy(action.key);
    try {
      const result = await action.run();
      onToolResult(result.message);
    } catch (e: any) {
      onToolResult(`Something went wrong: ${e?.message ?? e}`);
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  return (
    <>
      {/* hamburger trigger, pinned top-right below the status bar */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.trigger, { top: insets.top + 8 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilitylabel="Open tools menu"
      >
        <Ionicons name="menu" size={26} color={ICON_COLOR} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* tap outside to dismiss */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* stop propagation so taps on the card don't close it */}
          <Pressable
            style={[styles.card, { top: insets.top + 48 }]}
            onPress={() => {}}
          >
            <Text style={styles.cardTitle}>Tools</Text>

            {ACTIONS.map((action) => {
              const isBusy = busy === action.key;
              return (
                <TouchableOpacity
                  key={action.key}
                  style={[styles.item, isBusy && styles.itemBusy]}
                  onPress={() => handlePress(action)}
                  disabled={!!busy}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemIcon}>{action.icon}</View>
                  <Text style={styles.itemLabel}>{action.label}</Text>
                  {isBusy && (
                    <ActivityIndicator
                      size="small"
                      color={ICON_COLOR}
                      style={styles.spinner}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E1F20",
    alignItems: "center",
    justifyContent: "center",
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  card: {
    position: "absolute",
    right: 16,
    width: 240,
    backgroundColor: "#1E1F20",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 6,
    // subtle elevation
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  cardTitle: {
    color: "#A3A3A3",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  itemBusy: {
    backgroundColor: "#2A2B2C",
  },

  itemIcon: {
    width: 28,
    alignItems: "center",
  },

  itemLabel: {
    color: "#E3E3E3",
    fontSize: 15,
    marginLeft: 10,
    flex: 1,
  },

  spinner: {
    marginLeft: 8,
  },
});
