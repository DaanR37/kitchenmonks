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
import { cleanTaskName, generateInitials, getColorFromId } from "@/utils/taskUtils";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWindowDimensions } from "react-native";

export default function ChooseProfileScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isTabletLandscape = width > 800 && width > height;
  const searchParams = useLocalSearchParams<{ force?: string }>(); /* voor toegang tot de query parameters */
  const { activeProfile, setActiveProfile } = useContext(ProfileContext);
  const [kitchenId, setKitchenId] = useState<string | null>(null);
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

  /* ------------------------------------------------------------ */

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
  /* Nieuw profiel aanmaken */
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
  /* Gebruikt ProfileContext om het actieve profiel te wijzigen */
  const handleSelectProfile = (profile: ProfileData) => {
    console.log("Geselecteerd profiel:", profile);
    setActiveProfile(profile);
    router.push("/");
  };

  /* ------------------------------------------------------------ */

  /* Edit/Delete modal - Handler om de modal te tonen */
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

  /* ------------------------------------------------------------ */

  /* Helper functions */
  const generateInitials = (firstName: string, lastName: string): string => {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}`;
  };

  /* ------------------------------------------------------------ */

  /* Render Component - één profiel-item */
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
        {/* Profielnaam & initials */}
        <TouchableOpacity style={styles.profileItem} onPress={() => handleSelectProfile(item)}>
          <View style={[styles.initialsCircle, { backgroundColor: thumbnailColor }]}>
            <AppText style={styles.initialsText}>{initials}</AppText>
          </View>
          <AppText style={styles.profileName}>{fullName}</AppText>
        </TouchableOpacity>

        {/* Kebab-menu - drie puntjes) */}
        <TouchableOpacity onPress={() => handleShowEditModal(item)}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };

  /* ------------------------------------------------------------ */

  /* Modals - add & edit profile-item */
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
              <AppText style={styles.modalTitle}>Nieuwe gebruiker</AppText>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Voornaam"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCorrect={false}
                  placeholderTextColor="#666"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Achternaam"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCorrect={false}
                  placeholderTextColor="#666"
                />
              </View>
              {/* <View style={styles.buttonContainer}> */}
                <TouchableOpacity style={styles.saveButton} onPress={handleCreateProfile}>
                  <AppText style={styles.saveButtonText}>Opslaan</AppText>
                </TouchableOpacity>
              {/* </View> */}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

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

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Voornaam"
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholderTextColor="#666"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Achternaam"
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholderTextColor="#666"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEditProfile}>
                  <AppText style={styles.saveButtonText}>Opslaan</AppText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProfile}>
                  <AppText style={styles.deleteButtonText}>Verwijderen</AppText>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  /* ------------------------------------------------------------ */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button & headerText */}
      <View style={styles.backButtonHeaderContainer}>
        <TouchableOpacity style={styles.backButtonCircle} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={14} color="#333" />
        </TouchableOpacity>
        <AppText style={styles.headerText}>Profielen</AppText>
      </View>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={renderProfileItem}
        ListEmptyComponent={() => <AppText style={styles.emptyText}>Voeg een gebruiker toe</AppText>}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          /* Add button */
          <TouchableOpacity
            style={[styles.addProfileButton, isTabletLandscape && styles.addProfileButtonTablet]}
            onPress={() => setShowAddModal(true)}
          >
            <View style={[styles.plusCircle, isTabletLandscape && styles.plusCircleTablet]}>
              <Ionicons name="add" size={15} style={{ opacity: 0.5, color: "#333" }} />
            </View>
            <AppText style={[styles.addProfileText, isTabletLandscape && styles.addProfileTextTablet]}>
              Voeg gebruiker toe
            </AppText>
          </TouchableOpacity>
        }
      />
      {/* Modals - add & edit profile-item */}
      {renderAddProfileModal()}
      {renderEditProfileModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f1f6",
    paddingTop: Platform.select({
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

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Profielrij in de FlatList: links item, rechts de 3-puntjes */
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  profileItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  // -- Initials circle & text --
  initialsCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  initialsText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  profileName: {
    fontSize: 17,
    color: "#333",
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginVertical: 20,
  },

  /* “+ Voeg kok toe” button */
  addProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  plusCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  addProfileText: {
    flex: 1,
    fontSize: 17,
    color: "#666",
    opacity: 0.8,
  },

  // -- Tablet view --
  addProfileButtonTablet: {
    marginVertical: 12,
  },
  plusCircleTablet: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  addProfileTextTablet: {
    fontSize: 18,
    color: "#666",
    opacity: 0.8,
  },

  // -- Modal styling --
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  modalContent: {
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 30,
    // Shadow voor iOS:
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    // Elevation voor Android:
    elevation: 12,
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },

  /* Inputs */
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    padding: Platform.select({
      ios: 14,
      android: 12,
    }),
    borderRadius: 8,
    marginVertical: 4,
    fontSize: 16,
    backgroundColor: "#f2f1f6b3",
  },

  /* Buttons Modal - Edit/Delete */
  buttonContainer: {
    marginBottom: Platform.select({
      ios: 22,
      android: 12,
    }),
  },
  saveButton: {
    padding: 16,
    marginBottom: Platform.select({
      ios: 12,
      android: 8,
    }),
    borderRadius: 50,
    alignItems: "center",
    backgroundColor: "#017cff99",
    // backgroundColor: "#000",
  },
  saveButtonText: {
    color: "#000",
    fontSize: 17,
    // color: "#fff",
    // fontWeight: "bold",
  },
  deleteButton: {
    padding: 16,
    marginTop: 0,
    borderRadius: 50,
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#f61212",
  },
  deleteButtonText: {
    color: "#000",
    fontSize: 17,
    // fontWeight: "bold",
  },
});
