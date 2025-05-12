import React, { useState, useEffect, useContext } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { createProfile, fetchProfiles, updateProfile, deleteProfile } from "@/services/api/profiles";
import { ProfileContext, ProfileData } from "@/services/ProfileContext";
import { supabase } from "@/services/supabaseClient";
import AppText from "@/components/AppText";

export default function ChooseProfileScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ force?: string }>(); /* voor toegang tot de query parameters */
  const { activeProfile, setActiveProfile } = useContext(ProfileContext);
  const [kitchenId, setKitchenId] = useState<string | null>(null);
  // const [profiles, setProfiles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  /* State voor openen/sluiten Modal & nieuw profiel toevoegen */
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  /* State voor “Edit/Delete profile” modal */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editProfileId, setEditProfileId] = useState<string | null>(null);

  useEffect(() => {
    /* Als er al een actief profiel is en de query parameter 'force' niet is meegegeven, redirigeer dan naar de HomeScreen */
    if (activeProfile && !searchParams.force) {
      router.replace("/");
    }
  }, [activeProfile, searchParams]);

  /* Haal de user op en daarmee de kitchen_id */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth");
        return;
      }

      /* Haal de kitchen_id uit user_metadata (of elders) */
      const kId = user.user_metadata.kitchen_id;
      setKitchenId(kId);

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
      setShowAddModal(false);
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
  /* Handler om de Edit/Delete modal te tonen */
  const handleShowEditModal = (profile: ProfileData) => {
    setEditProfileId(profile.id);
    setEditFirstName(profile.first_name);
    setEditLastName(profile.last_name);
    setShowEditModal(true);
  };

  /* Handler om changes in de modal op te slaan */
  const handleSaveEditProfile = async () => {
    if (!editProfileId || !editFirstName.trim() || !editLastName.trim()) return;
    try {
      /* Voer de update in de database uit */
      const updatedProfile = await updateProfile(editProfileId, editFirstName, editLastName);
      /* Update de lokale profielen state */
      const updatedList = profiles.map((p) =>
        p.id === editProfileId
          ? { ...p, first_name: updatedProfile.first_name, last_name: updatedProfile.last_name }
          : p
      );
      setProfiles(updatedList);
      /* Als het profiel dat je bewerkt ook actief is, update dan ook de context */
      if (activeProfile && activeProfile.id === editProfileId) {
        setActiveProfile({
          ...activeProfile,
          first_name: updatedProfile.first_name,
          last_name: updatedProfile.last_name,
        });
      }
      /* Sluit de edit modal */
      setShowEditModal(false);
    } catch (error: any) {
      console.error("Error saving profile changes:", error.message);
      alert("Er is iets misgegaan bij het bewerken van het profiel.");
    }
  };

  /* Handler om een profiel te verwijderen */
  const handleDeleteProfile = async () => {
    if (!editProfileId) return;
    try {
      await deleteProfile(editProfileId);
      const updatedList = profiles.filter((p) => p.id !== editProfileId);
      setProfiles(updatedList);
      setShowEditModal(false);
    } catch (error: any) {
      console.error("Error deleting profile:", error.message);
      alert("Er is iets misgegaan bij het verwijderen van het profiel.");
    }
  };

  const generateInitials = (firstName: string, lastName: string): string => {
    /* Controleer of voornaam en achternaam bestaan en niet null/undefined zijn */
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}`;
  };

  /* Render één profiel-item */
  const renderProfileItem = ({ item }: { item: ProfileData }) => {
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
      <View style={styles.profileRow}>
        <TouchableOpacity style={styles.profileItem} onPress={() => handleSelectProfile(item)}>
          <View style={[styles.initialsCircle, { backgroundColor: thumbnailColor }]}>
            <AppText style={styles.initialsText}>{initials}</AppText>
          </View>
          <AppText style={styles.profileName}>{fullName}</AppText>
        </TouchableOpacity>

        {/* Drie puntjes-knop rechts (kebab menu) */}
        <TouchableOpacity style={styles.moreButton} onPress={() => handleShowEditModal(item)}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };
  /* Modal voor nieuw profiel toevoegen */
  const renderAddProfileModal = () => {
    return (
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          {/* Buitenste laag die de achtergrond dimt */}
          <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <AppText style={styles.modalTitle}>Nieuw profiel</AppText>
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
                <AppText style={styles.saveButtonText}>Opslaan</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <AppText style={styles.cancelButtonText}>Annuleren</AppText>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  /* Modal voor Edit/Delete profiel */
  const renderEditProfileModal = () => {
    return (
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <AppText style={styles.modalTitle}>Profiel bewerken</AppText>
              <TextInput
                style={styles.input}
                placeholder="Voornaam"
                value={editFirstName}
                onChangeText={setEditFirstName}
                autoCorrect={false}
              />
              <TextInput
                style={styles.input}
                placeholder="Achternaam"
                value={editLastName}
                onChangeText={setEditLastName}
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEditProfile}>
                <AppText style={styles.saveButtonText}>Opslaan</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteButton, { marginTop: 12 }]}
                onPress={handleDeleteProfile}
              >
                <AppText style={styles.deleteButtonText}>Verwijderen</AppText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                <AppText style={styles.cancelButtonText}>Annuleren</AppText>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AppText>Loading profiles...</AppText>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/auth")}>
          <View style={styles.backButtonCircle}>
            <Ionicons name="chevron-back" size={14} color="#333" />
          </View>
        </TouchableOpacity>
        {/* <AppText style={styles.title}>Kies je profiel</AppText> */}
      </View>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={renderProfileItem}
        ListEmptyComponent={() => <AppText style={styles.emptyText}>Geen profielen gevonden.</AppText>}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 30 }}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addProfileButton} onPress={() => setShowAddModal(true)}>
            <AppText style={styles.addProfileText}>+ Voeg kok toe</AppText>
          </TouchableOpacity>
        }
      />
      {renderAddProfileModal()}
      {renderEditProfileModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    paddingVertical: Platform.select({
      ios: 75,
      android: 15,
    }),
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
    // paddingTop: 16,
    // paddingBottom: 8,
    // paddingVertical: Platform.select({
    //   ios: 10,
    //   android: 5,
    // }),
    marginTop: Platform.select({
      ios: 10,
      android: 5,
    }),
  },
  backButton: {
    marginRight: 8,
  },
  backButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0e0e0", // zachte grijze cirkel
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    color: "#333",
    fontWeight: "600",
  },
  /* Profielrij in de FlatList: links item, rechts de 3-puntjes */
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    // paddingHorizontal: 12,
    // paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  profileItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    // marginBottom: 8,
    // marginHorizontal: 16,
  },
  moreButton: {
    padding: 4,
    marginLeft: 6,
    marginRight: 16,
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
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginVertical: 20,
  },

  /** “+ Voeg kok toe” button */
  addProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  addProfileText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginLeft: 8,
  },

  // -- Modal styling --
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  input: {
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "#ccc",
    fontSize: 15,
    backgroundColor: "#fff",
  },
  saveButton: {
    padding: 12,
    borderRadius: 50,
    marginTop: 4,
    alignItems: "center",
    backgroundColor: "#000",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: { padding: 10, alignItems: "center" },
  cancelButtonText: { color: "#666", fontWeight: "bold", fontSize: 14 },
  deleteButton: {
    padding: 12,
    borderRadius: 50,
    marginTop: 4,
    alignItems: "center",
    backgroundColor: "#f61212",
  },
  deleteButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
});
