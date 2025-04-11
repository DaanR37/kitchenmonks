import React, { useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ProfileContext } from "@/services/ProfileContext";
import { logoutUser } from "@/services/api/logout";

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
      {/* Header / Titel */}
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Profiel</Text>
      </View>

      {/* Menu-items */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          // Ga naar /profiles om actief profiel te wisselen
          router.push("/profiles?force=true");
        }}
      >
        <Text style={styles.menuItemText}>Profielen</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          // bv. router.push("/sommigeKaartSelectie");
          console.log("Kaart selecteren...");
        }}
      >
        <Text style={styles.menuItemText}>Selecteer kaart</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          // router.push("/settings");
          console.log("Instellingen...");
        }}
      >
        <Text style={styles.menuItemText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
        <Text style={[styles.menuItemText, { color: "#e53935" }]}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  headerRow: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  menuItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});
