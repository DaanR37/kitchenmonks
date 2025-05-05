import { Stack } from "expo-router";
import { AuthProvider } from "@/services/AuthContext";
import { ProfileProvider } from "@/services/ProfileContext";
import { DateProvider } from "@/services/DateContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <DateProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </DateProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
