import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  // ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createProfile, fetchProfiles } from "@/services/api/profiles";
import { ProfileContext, ProfileData } from "@/services/ProfileContext";
import { supabase } from "@/services/supabaseClient";

export default function ChooseProfileScreen() {
  const router = useRouter();
  const { activeProfile, setActiveProfile } = useContext(ProfileContext);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* State voor het toevoegen van een nieuw profiel */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [kitchenId, setKitchenId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile) {
      router.replace("/");
    }
  }, [activeProfile]);

  /* Haal de user op en daarmee de kitchen_id */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("User:", user);

      if (!user) {
        router.replace("/auth");
        return;
      }

      /* Haal de kitchen_id uit user_metadata (of elders) */
      const kId = user.user_metadata.kitchen_id;
      setKitchenId(kId);
      console.log("Kitchen_id:", kId);

      if (!kId) {
        console.log("Geen kitchen_id gevonden in user_metadata");
        setLoading(false);
        return;
      }

      await loadProfiles(kId);
    })();
  }, []);

  /* Profile Handlers */
  const loadProfiles = async (kId: string) => {
    try {
      setLoading(true);
      const data = await fetchProfiles(kId);
      setProfiles(data);
    } catch (error: any) {
      console.error("Error loading profiles:", error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateProfile = async () => {
    if (!kitchenId || !firstName.trim() || !lastName.trim()) return;
    try {
      const newProfile = await createProfile(kitchenId, firstName, lastName);
      setProfiles([...profiles, newProfile]);
      /* Reset de velden */
      setFirstName("");
      setLastName("");
      setShowAddForm(false);
    } catch (error: any) {
      console.log("Error creating profile:", error.message);
      alert("Er is iets misgegaan bij het aanmaken van het profiel.");
    }
  };
  const handleSelectProfile = (profile: ProfileData) => {
    console.log("Geselecteerd profiel:", profile);
    setActiveProfile(profile);
    router.push("/");
  };

  const generateInitials = (firstName: string, lastName: string): string => {
    /* Controleer of voornaam en achternaam bestaan en niet null/undefined zijn */
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}`;
  };

  /* Renderen van één profiel-item */
  const renderProfileItem = ({ item }: { item: any }) => {
    const initials = generateInitials(item.first_name, item.last_name);
    const fullName = `${item.first_name} ${item.last_name}`.trim();

    const colorPalette = ["#3300ff", "#ff6200", "#00931d", "#d02350"];
    let hash = 0;
    for (let i = 0; i < item.id.length; i++) {
      hash = item.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorPalette.length;
    const thumbnailColor = colorPalette[index];

    return (
      <TouchableOpacity style={styles.profileItem} onPress={() => handleSelectProfile(item)}>
        <View style={[styles.initialsCircle, { backgroundColor: thumbnailColor }]}>
          <Text style={styles.initialsText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{fullName}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profiles...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <View style={styles.mainContainer}>
        {/* Header met chevron en tekst “Kies je profiel” */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/auth")}>
            <Ionicons name="chevron-back" size={20} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Kies je profiel</Text>
        </View>

        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderProfileItem}
          ListEmptyComponent={() => <Text style={styles.emptyText}>Geen profielen gevonden.</Text>}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ paddingBottom: 120 }}
        />

        <View style={styles.addFormContainer}>
          {showAddForm ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Voornaam"
                value={firstName}
                onChangeText={setFirstName}
                autoCorrect={false}
              />
              <TextInput
                style={styles.input}
                placeholder="Achternaam"
                value={lastName}
                onChangeText={setLastName}
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleCreateProfile}>
                <Text style={styles.saveButtonText}>Opslaan</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.addProfileButton} onPress={() => setShowAddForm(true)}>
              <Text style={styles.addProfileText}>+ Voeg kok toe</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    // padding: 16,
    backgroundColor: "#f6f6f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    color: "#666",
    fontWeight: "500",
    // marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginVertical: 20,
  },
  profileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  initialsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  initialsText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  profileName: {
    fontSize: 16,
    color: "#333",
  },
  addFormContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f6f6f6",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: "#6C63FF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  addProfileButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  addProfileText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
});
