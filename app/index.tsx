import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";

/* Import de contexten waarin de ingelogde user, profile en geselecteerde datum staan */
import { AuthContext } from "@/services/AuthContext";
import { ProfileContext } from "@/services/ProfileContext";
import { DateContext } from "@/services/DateContext";

/* Import je API-functies voor secties */
import { fetchSections, createSection } from "@/services/api/sections";

import DateSelector from "@/components/DateSelector";
import SearchBar from "@/components/SearchBar";
import StatsSection from "@/components/StatsSection";
import SectionItems, { SectionData } from "@/components/SectionItems";
import { logoutUser } from "@/services/api/logout";

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading } = useContext(AuthContext);
  const { activeProfile, setActiveProfile } = useContext(ProfileContext);
  const { selectedDate, setSelectedDate } = useContext(DateContext);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [showAddSectionForm, setShowAddSectionForm] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionStartDate, setNewSectionStartDate] = useState<string>(selectedDate);
  const [newSectionEndDate, setNewSectionEndDate] = useState<string>(selectedDate);

  /* Check of de user ingelogd is - anders redirect naar auth/login */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user]);

  /* Zodra de user (en dus kitchen_id) beschikbaar is, en wanneer selectedDate wijzigt,
  roep je loadSections aan om de secties op te halen voor de kitchen */
  useEffect(() => {
    if (user) {
      const kitchenId = user.user_metadata?.kitchen_id;
      if (kitchenId) {
        loadSections(kitchenId);
      }
    }
  }, [user, selectedDate]);

  /* Functie: Laadt alle secties voor de gegeven kitchen_id
  Opmerking: je kunt hier eventueel de datum als filter meegeven als je secties datumgebonden wilt maken,
  maar in dit voorbeeld haal je alle secties op en filter je ze later in de UI op geldigheid via start- en einddatum. */
  async function loadSections(kitchenId: string /* date: string */) {
    setLoadingSections(true);
    try {
      /* fetchSections haalt de secties op. We geven hier alleen kitchenId mee,
      omdat de filtering op datum gebeurt in de query in Supabase (als je dat wilt inschakelen) */
      const data = await fetchSections(kitchenId /* date */);
      /* Map de data naar jouw SectionData type */
      const mappedSections: SectionData[] = data.map((section: any) => ({
        id: section.id,
        /* Gebruik section_name of fallback naar section.name */
        section_name: section.section_name ?? section.name,
        task_templates: section.task_templates || [],
      }));
      setSections(mappedSections);
      console.log("Sections loaded:", mappedSections);
    } catch (error: any) {
      console.error("Error loading sections:", error.message);
    } finally {
      setLoadingSections(false);
    }
  }

  /* Creëer een nieuwe sectie met de ingevoerde naam en de start- en einddatum */
  async function handleCreateSection() {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId || !newSectionName.trim()) return;

    try {
      const newSection = await createSection(
        kitchenId,
        newSectionName,
        newSectionStartDate,
        newSectionEndDate
      );
      /* Maak een nieuw object volgens het SectionData type */
      const newSectionObj: SectionData = {
        id: newSection.id,
        section_name: newSection.section_name ?? newSection.name,
        task_templates: [] /* Geen taken bij aanmaak */,
      };
      /* Voeg de nieuwe sectie toe aan de bestaande lijst */
      setSections([...sections, newSectionObj]);
      setNewSectionName("");
      setNewSectionStartDate(selectedDate);
      setNewSectionEndDate(selectedDate);
      setShowAddSectionForm(false);
    } catch (error: any) {
      console.error("Error creating section:", error.message);
      alert("Er ging iets mis bij het aanmaken van de sectie");
    }
  }

  /* Verander de geselecteerde datum (bijvoorbeeld vanuit een DateSelector component) */
  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
  }

  /* Functie: Druk op een sectie in de lijst */
  function handlePressSection(sectionId: string) {
    /* Hier een navigatie naar een sectiedetailpagina, bijvoorbeeld: router.push(`/sections/${sectionId}`) */
    console.log("Pressed section:", sectionId);
  }

  /* Roep logoutUser aan, reset context en navigeer terug naar /auth */
  async function handleLogout() {
    setMenuVisible(false);
    await logoutUser();
    setActiveProfile(null);
    router.replace("/auth");
  }

  /* Genereer initialen van het actieve profiel, als dit beschikbaar is */
  function generateInitials(firstName?: string, lastName?: string): string {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}`;
  }

  function getColorFromId(id: string): string {
    const colorPalette = ["#3300ff", "#ff6200", "#00931d", "#d02350"];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
  }

  const initials = generateInitials(activeProfile?.first_name, activeProfile?.last_name);
  const avatarColor = activeProfile ? getColorFromId(activeProfile.id) : "#6C63FF";

  /* Render: Als loading of loadingSections true is, toon een indicator */
  if (loading || loadingSections) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <View style={styles.container}>
        {/* Header - Logo / DateSelector / Avatar */}
        <View style={styles.header}>
          <Image source={require("../assets/images/kitchenmonks-logo.png")} style={styles.logo} />
          <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} />

          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            {activeProfile ? (
              <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            ) : (
              <Image source={require("../assets/images/ExampleAvatar.png")} style={styles.avatar} />
            )}
          </TouchableOpacity>
        </View>

        {/* Zoekbalk & Datum / Statistieken */}
        <SearchBar />
        <StatsSection />
        <SectionItems sections={sections} onPressSection={handlePressSection} />

        {/* Menu-modal voor logout */}
        <Modal
          visible={menuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            onPressOut={() => setMenuVisible(false)}
            activeOpacity={1}
            style={styles.modalOverlay}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity onPress={handleLogout} style={styles.menuItem}>
                <Text style={styles.menuText}>Uitloggen</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                <Text style={styles.menuText}>Annuleren</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Formulier om een nieuwe sectie toe te voegen */}
        <View style={styles.addFormContainer}>
          {showAddSectionForm ? (
            <View style={styles.addSectionForm}>
              <TextInput
                style={styles.input}
                placeholder="Sectie naam"
                value={newSectionName}
                onChangeText={setNewSectionName}
                autoCorrect={false}
              />
              {/* Hier een Date Picker gebruiken! */}
              <TextInput
                style={styles.input}
                placeholder="Startdatum (YYYY-MM-DD)"
                value={newSectionStartDate}
                onChangeText={setNewSectionStartDate}
              />
              <TextInput
                style={styles.input}
                placeholder="Einddatum (YYYY-MM-DD)"
                value={newSectionEndDate}
                onChangeText={setNewSectionEndDate}
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleCreateSection}>
                <Text style={styles.saveButtonText}>Opslaan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddSectionForm(false)}>
                <Text style={styles.cancelButtonText}>Annuleren</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addSectionButton} onPress={() => setShowAddSectionForm(true)}>
              <Text style={styles.addSectionText}>+ Voeg sectie toe</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  avatarCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "#6C63FF",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  avatar: {
    width: 35,
    height: 35,
    resizeMode: "contain",
  },
  taskItem: {
    backgroundColor: "#fff",
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
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
  addSectionForm: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginVertical: 16,
  },
  cancelButton: { alignItems: "center", padding: 10 },
  cancelButtonText: { color: "#666" },
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
  addSectionButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  addSectionText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: 200,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 8,
  },
  menuText: {
    fontSize: 16,
    textAlign: "center",
  },
});
