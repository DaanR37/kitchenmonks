import { Slot } from "expo-router";
import { AuthProvider } from "@/services/AuthContext";
import { ProfileProvider } from "@/services/ProfileContext";
import { DateProvider } from "@/services/DateContext";
import { useEffect } from "react";
import { LogBox, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  // Suppress specific warnings that might be related to navigation context
  useEffect(() => {
    LogBox.ignoreLogs([
      "Couldn't find the prevent remove context",
      "ViewPropTypes will be removed from React Native",
    ]);
  }, []);
  
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <DateProvider>
              {/* Slot is the standard approach in Expo Router v4 */}
              <Slot />
            </DateProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
