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
      {/* Header / Titel + Back-button */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/")}>
          <View style={styles.backButtonCircle}>
            <Ionicons name="chevron-back" size={14} color="#333" />
          </View>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: Platform.select({
      ios: 85,
      android: 35,
    }),
  },
  backButton: {
    marginBottom: 10,
    marginRight: 12, // optioneel als je hem wilt scheiden van de tekst
  },
  backButtonCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0e0e0dc", // zachtgrijs
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8, // ruimte tussen chevron en 'Profiel'
  },
  backButtonText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 4,
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
