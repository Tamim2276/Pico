import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { useTheme } from "@presentation/context/ThemeContext";
import HomeScreen from "@presentation/screens/home/HomeScreen";
import TasksScreen from "@presentation/screens/tasks/TasksScreen";
import CalendarScreen from "@presentation/screens/calendar/CalendarScreen";
// Assistant screen import removed (not found). Remove Assistant tab if needed.
import ProfileScreen from "@presentation/screens/profile/ProfileScreen";
import { AssistantScreen } from "@presentation/screens/assistant/AssistantScreen"; // Import the new AssistantScreen
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: "🏠",
  Tasks: "🗒️",
  Calendar: "📅",
  Assistant: "🤖",
  Profile: "👤",
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        styles.tabBarSafeArea,
        { backgroundColor: colors.surface, borderTopColor: colors.divider },
      ]}
    >
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            if (!isFocused) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={onPress}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.tabPill,
                  isFocused && { backgroundColor: colors.inputBg },
                ]}
              >
                <Text
                  style={[styles.tabIcon, isFocused && styles.tabIconActive]}
                >
                  {TAB_ICONS[route.name]}
                </Text>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: colors.textHint },
                    isFocused && { color: colors.primary },
                  ]}
                >
                  {route.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarSafeArea: {
    borderTopWidth: 1,
  },

  tabBar: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 6,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
  },

  tabPill: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    minWidth: 58,
  },

  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.5,
  },

  tabIconActive: {
    opacity: 1,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
});
