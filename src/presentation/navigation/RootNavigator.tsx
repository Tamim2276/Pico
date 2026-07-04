import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "@presentation/screens/auth/SplashScreen";
import SignUpScreen from "@presentation/screens/auth/SignUpScreen";
// --- Added ---
import LoginScreen from "@presentation/screens/auth/LoginScreen";
import MainTabs from "@presentation/navigation/MainTabs";
import NotificationsScreen from "@presentation/screens/notifications/NotificationsScreen";
import { AppStateProvider } from "@presentation/hooks/useAppState";
// --- End added ---

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    // AppStateProvider added so Home/Tasks/Calendar/Profile/Assistant
    // screens can share the same in-memory tasks/events/notifications/
    // profile state. Does not affect Splash or SignUp, which don't use it.
    <AppStateProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          {/* --- Added --- */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ animation: "slide_from_right" }}
          />
          {/* --- End added --- */}
        </Stack.Navigator>
      </NavigationContainer>
    </AppStateProvider>
  );
}
