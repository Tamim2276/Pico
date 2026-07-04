import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { COLORS } from "@shared/constants/data";

import HomeScreen from "@presentation/screens/home/HomeScreen";
import TasksScreen from "@presentation/screens/tasks/TasksScreen";
import CalendarScreen from "@presentation/screens/calendar/CalendarScreen";
import AssistantScreen from "@presentation/screens/assistant/AssistantScreen";
import ProfileScreen from "@presentation/screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: "🏠",
  Tasks: "📋",
  Calendar: "📅",
  Assistant: "🎙️",
  // Bottom navbar's Profile icon -> ProfileScreen, as requested
  Profile: "👤",
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textHint,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.divider,
          height: 76,
          paddingBottom: 14,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontWeight: "bold", fontSize: 10, textTransform: "uppercase" },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
