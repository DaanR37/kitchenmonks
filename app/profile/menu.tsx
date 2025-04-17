import React, { useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ProfileContext } from "@/services/ProfileContext";
import { logoutUser } from "@/services/api/logout";
import { Ionicons } from "@expo/vector-icons";

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

      {/* Profielen */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          router.push("/profiles?force=true");
        }}
      >
        <Text style={styles.menuItemText}>Profielen</Text>
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
        <Text style={styles.menuItemText}>Selecteer kaart</Text>
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
        <Text style={styles.menuItemText}>Instellingen</Text>
        <Ionicons name="chevron-forward" size={16} color="black" />
      </TouchableOpacity>

      {/* Uitloggen */}
      <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
        <Text style={[styles.menuItemText, { color: "#e53935" }]}>Uitloggen</Text>
        <Ionicons name="chevron-forward" size={16} color="black" />
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});
