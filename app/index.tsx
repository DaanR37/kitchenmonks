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
  Pressable,
} from "react-native";
import { AuthContext } from "@/services/AuthContext";
import { ProfileContext } from "@/services/ProfileContext";
import { DateContext } from "@/services/DateContext";
import { fetchSections, createSection } from "@/services/api/sections";
import DateSelector from "@/components/DateSelector";
import SearchBar from "@/components/SearchBar";
import StatsSection from "@/components/StatsSection";
import SectionItems, { SectionData } from "@/components/SectionItems";
import {
  fetchMyTasksCount,
  fetchAllDonePercentage,
  fetchActiveCountPerSection,
  fetchActiveTasksCount,
  fetchOutOfStockTasksCount,
} from "@/services/api/taskStats";
import { supabase } from "@/services/supabaseClient";
import Ionicons from "@expo/vector-icons/build/Ionicons";

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading } = useContext(AuthContext);
  const { activeProfile, setActiveProfile } = useContext(ProfileContext);
  const { selectedDate, setSelectedDate } = useContext(DateContext);

  /* State voor secties */
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);

  /* State voor StatsSection & Count SectionItems */
  const [myMepCount, setMyMepCount] = useState(0);
  const [teamMepCount, setTeamMepCount] = useState(0);
  const [allPercentage, setAllPercentage] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [activeTasksCountPerSection, setActiveTasksCountPerSection] = useState<Record<string, number>>({});

  /* State voor Modal -> nieuwe sectie toevoegen */
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionStartDate, setNewSectionStartDate] = useState<string>(selectedDate);
  const [newSectionEndDate, setNewSectionEndDate] = useState<string>(selectedDate);

  /* Check of de user ingelogd is - anders redirect naar auth/login */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user]);

  /* Haal de secties op en update de tellers */
  useEffect(() => {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (kitchenId) {
      loadSections(kitchenId);
      updateStats(); // stats voor MyTasks, Inactive, etc.
    }
  }, [user, selectedDate]);

  /* Update beide tellers bij initial load en datum wisseling */
  useEffect(() => {
    updateStats();
  }, [activeProfile, selectedDate]);

  /* Real-time subscription instellen voor task_instances tabel */
  useEffect(() => {
    if (!user || !activeProfile || !selectedDate) return;

    const channel = supabase
      .channel("taskInstancesChannel")
      .on(
        "postgres_changes",
        {
          event: "*", // luister naar INSERT, UPDATE, DELETE
          schema: "public",
          table: "task_instances",
        },
        (payload: any) => {
          console.log("Realtime update (task_instances):", payload);
          updateStats();
        }
      )
      .subscribe();

    /* Cleanup bij unmount */
    return () => {
      channel.unsubscribe();
    };
  }, [user, activeProfile, selectedDate]);

  /* Functie: Laadt alle secties voor de gegeven kitchen_id
  Opmerking: je kunt hier eventueel de datum als filter meegeven als je secties datumgebonden wilt maken,
  maar in dit voorbeeld haal je alle secties op en filter je ze later in de UI op geldigheid via start- en einddatum. */
  async function loadSections(kitchenId: string /* date: string */) {
    setLoadingSections(true);
    try {
      /* We geven hier alleen kitchenId mee, omdat de filtering op datum gebeurt 
      in de query in Supabase (als je dat wilt inschakelen) */
      const data = await fetchSections(kitchenId /* date */);
      const mappedSections: SectionData[] = data.map((section: any) => ({
        id: section.id,
        section_name: section.section_name ?? section.name,
        start_date: section.start_date,
        end_date: section.end_date,
        task_templates: section.task_templates || [],
      }));
      setSections(mappedSections);
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
        start_date: newSection.start_date,
        end_date: newSection.end_date,
        task_templates: [] /* Geen taken bij aanmaak */,
      };
      /* Voeg de nieuwe sectie toe aan de bestaande lijst */
      setSections([...sections, newSectionObj]);
      setNewSectionName("");
      setNewSectionStartDate(selectedDate);
      setNewSectionEndDate(selectedDate);
      setShowAddModal(false);
    } catch (error: any) {
      console.error("Error creating section:", error.message);
      alert("Er ging iets mis bij het aanmaken van de sectie");
    }
  }
  /* Update de StatsSection counts & activeTasksCountPerSection */
  async function updateStats() {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;

    const allPercentage = await fetchAllDonePercentage(selectedDate);
    setAllPercentage(allPercentage);

    if (activeProfile) {
      const myMepCount = await fetchMyTasksCount(activeProfile.id, selectedDate);
      setMyMepCount(myMepCount);
    }

    const activeCountTeamMep = await fetchActiveTasksCount(selectedDate);
    setTeamMepCount(activeCountTeamMep);

    const outOfStockCount = await fetchOutOfStockTasksCount(selectedDate);
    setOutOfStockCount(outOfStockCount);

    if (kitchenId) {
      const activeCount = await fetchActiveCountPerSection(kitchenId, selectedDate);
      setActiveTasksCountPerSection(activeCount);
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

  const renderAddSectionModal = () => {
    return (
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        {/* Buitenste laag die de achtergrond dimt */}
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* <View style={styles.modalContent}> */}
            <Text style={styles.modalTitle}>Nieuwe sectie</Text>
            <TextInput
              style={styles.input}
              placeholder="Sectie naam"
              value={newSectionName}
              onChangeText={setNewSectionName}
              autoCorrect={false}
            />
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
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButtonText}>Annuleren</Text>
            </TouchableOpacity>
            {/* </View> */}
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

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
      {/* Outer container met flex: 1 */}
      <View style={styles.container}>
        {/* Header - Logo / DateSelector / Avatar */}
        <View style={styles.header}>
          <Image source={require("../assets/images/KITCHENMONKSLOGOX.png")} style={styles.logo} />
          <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} />

          <TouchableOpacity onPress={() => router.push("/profile/menu")}>
            {activeProfile ? (
              <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            ) : (
              <Image source={require("../assets/images/ExampleAvatar.png")} style={styles.avatar} />
            )}
          </TouchableOpacity>
        </View>

        {/* 1) SearchBar */}
        <SearchBar />

        {/* 2) Een View met flex: 1 waarin SectionItems rendert */}
        <View style={styles.listContainer}>
          <SectionItems
            ListHeaderComponent={
              <View>
                <StatsSection
                  myMepCount={teamMepCount}
                  teamMepCount={teamMepCount}
                  allPercentage={allPercentage}
                  outOfStockCount={outOfStockCount}
                />

                {/* De “+ Voeg sectie toe” Button, die de modal opent */}
                <TouchableOpacity style={styles.addSectionButton} onPress={() => setShowAddModal(true)}>
                  <Text style={styles.addSectionText}>+  Voeg sectie toe</Text>
                  <Ionicons name="chevron-forward" size={16} color="black" />
                </TouchableOpacity>
              </View>
            }
            sections={sections}
            onPressSection={handlePressSection}
            activeTasksCountPerSection={activeTasksCountPerSection}
          />
        </View>

        {/* Formulier om een nieuwe sectie toe te voegen */}
        {renderAddSectionModal()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    paddingHorizontal: 16,
    paddingTop: 25,
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
    marginBottom: 10,
  },
  listContainer: {
    flex: 1,
  },
  logo: {
    width: 35,
    height: 35,
    resizeMode: "contain",
  },
  avatarCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "#f2f2f2",
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#6C63FF",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelButton: { padding: 10, alignItems: "center" },
  cancelButtonText: { color: "#666", fontWeight: "bold" },
  addSectionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingLeft: 18,
    paddingRight: 12,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 8,
  },
  addSectionText: {
    flex: 1,
    fontSize: 16,
    color: "#666",
    opacity: 0.7,
    fontWeight: "600",
  },
});
