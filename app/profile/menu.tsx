import React, { useContext } from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ProfileContext } from "@/services/ProfileContext";
import { logoutUser } from "@/services/api/logout";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/components/AppText";

export default function ProfileMenuScreen() {
  const router = useRouter();
  const { setActiveProfile } = useContext(ProfileContext);

  /* Roep logoutUser aan, reset context en navigeer terug naar /auth */
  async function handleLogout() {
    await logoutUser();
    setActiveProfile(null);
    router.replace("/auth");
  }

  return (
    <View style={styles.container}>
      {/* Back button & headerText */}
      <View style={styles.backButtonHeaderContainer}>
        <TouchableOpacity style={styles.backButtonCircle} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={14} color="#333" />
        </TouchableOpacity>
        <AppText style={styles.headerText}>Menu</AppText>
      </View>

      {/* Profielen */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          router.push("/profiles?force=true");
        }}
      >
        <AppText style={styles.menuItemText}>Profielen</AppText>
        <Ionicons name="chevron-forward" size={16} color="black" />
      </TouchableOpacity>

      {/* Kaart selecteren */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          // bv. router.push("/sommigeKaartSelectie");
          console.log("Kaart selecteren...");
        }}
      >
        <AppText style={styles.menuItemText}>Selecteer kaart</AppText>
        <Ionicons name="chevron-forward" size={16} color="black" />
      </TouchableOpacity>

      {/* Instellingen */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          // router.push("/settings");
          console.log("Instellingen...");
        }}
      >
        <AppText style={styles.menuItemText}>Instellingen</AppText>
        <Ionicons name="chevron-forward" size={16} color="black" />
      </TouchableOpacity>

      {/* Uitloggen */}
      <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
        <AppText style={[styles.menuItemText, { color: "#e53935" }]}>Uitloggen</AppText>
        <Ionicons name="chevron-forward" size={16} color="black" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    paddingVertical: Platform.select({
      ios: 85,
      android: 35,
    }),
  },

  /* Back button */
  backButtonHeaderContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 35,
  },
  backButtonCircle: {
    position: "absolute",
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0e0e0dc",
  },
  headerText: {
    position: "absolute",
    fontSize: 19,
    fontWeight: "bold",
    justifyContent: "center",
  },

  /* Menu items */
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});
