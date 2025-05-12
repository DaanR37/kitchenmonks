import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { AuthContext } from "@/services/AuthContext";
import { ProfileContext } from "@/services/ProfileContext";
import { DateContext } from "@/services/DateContext";
import { fetchSections, createSection } from "@/services/api/sections";
import DateSelector, { formatDateString } from "@/components/DateSelector";
import StatsSection from "@/components/StatsSection";
import SectionItems, { SectionData } from "@/components/SectionItems";
import {
  fetchAllDonePercentage,
  fetchActiveTasksCount,
  fetchMyTasksCount,
  fetchOutOfStockTasksCount,
  fetchActiveCountPerSection,
} from "@/services/api/taskStats";
import { supabase } from "@/services/supabaseClient";
import CalendarModal from "@/components/CalendarModal";
import AppText from "@/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import AllTasksTabletView from "@/components/AllTasksTabletView";
import TeamMepTabletView from "@/components/TeamMepTabletView";
import MyMepTabletView from "@/components/MyMepTabletView";
import OutOfStockTabletView from "@/components/OutOfStockTabletView";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers";
import NoStatusTabletView from "@/components/NoStatusTabletView";

export default function HomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isTabletLandscape = width > 800 && width > height;
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useContext(AuthContext);
  const { activeProfile } = useContext(ProfileContext);
  const { selectedDate, setSelectedDate } = useContext(DateContext);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [myMepCount, setMyMepCount] = useState(0);
  const [teamMepCount, setTeamMepCount] = useState(0);
  const [allPercentage, setAllPercentage] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [noStatusCount, setNoStatusCount] = useState(0);

  const [hasAllData, setHasAllData] = useState(false);
  const [hasMyMepData, setHasMyMepData] = useState(false);
  const [hasTeamMepData, setHasTeamMepData] = useState(false);
  const [hasOutOfStockData, setHasOutOfStockData] = useState(false);
  const [hasNoStatusData, setHasNoStatusData] = useState(false);
  const [activeTasksCountPerSection, setActiveTasksCountPerSection] = useState<Record<string, number>>({});

  /* State voor Modal -> nieuwe sectie toevoegen */
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionStartDate, setNewSectionStartDate] = useState<string>(selectedDate);
  const [newSectionEndDate, setNewSectionEndDate] = useState<string>(selectedDate);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"allTasks" | "teamMep" | "myMep" | "outOfStock" | "noStatus">(
    "allTasks"
  );

  /* Check of de user ingelogd is - anders redirect naar auth/login */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user]);

  /* Initial load of bij datum/profielwissel */
  useEffect(() => {
    console.log("▶ useEffect [user, activeProfile, selectedDate] triggered");
    if (user && selectedDate) {
      loadSectionsWithTasksAndUpdateStats();
    }
  }, [user, activeProfile, selectedDate]);

  /* Realtime listener → alleen aanmaken bij login */
  useEffect(() => {
    console.log("▶ Supabase subscription created");
    if (!user) return;

    const channel = supabase
      .channel("taskInstancesChannel")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_instances" }, (payload: any) => {
        console.log("▶ Supabase realtime payload", payload);

        /* Voorkom loop: alleen update als payload bij geselecteerde datum hoort */
        if (payload?.new?.date === selectedDate) {
          console.log("▶ Supabase triggers update");
          loadSectionsWithTasksAndUpdateStats();
        }
      })
      .subscribe();

    return () => {
      console.log("▶ Supabase channel unsubscribed");
      channel.unsubscribe();
    };
  }, [user, selectedDate]);

  async function loadSectionsWithTasksAndUpdateStats() {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;

    // console.log("▶ loadSectionsWithTasksAndUpdateStats START");
    setLoadingSections(true);
    try {
      // 1️⃣ Haal secties op
      const secs = await fetchSections(kitchenId, selectedDate);
      // console.log("▶ fetched sections");

      // 2️⃣ Haal taken per sectie op en verrijk met section-info
      const mergedSections: SectionData[] = await Promise.all(
        secs.map(async (section: any) => {
          const tasks = await getTasksForSectionOnDate(section.id, selectedDate);
          console.log("▶ fetched stats");
          return {
            id: section.id,
            section_name: section.section_name ?? section.name,
            start_date: section.start_date,
            end_date: section.end_date,
            task_templates: tasks,
          };
        })
      );

      const allTasks = mergedSections.flatMap((sec) => sec.task_templates);

      const hasAll = allTasks.length > 0;
      setHasAllData(hasAll);

      const hasMyMep = allTasks.some(
        (task) => activeProfile?.id && task.assigned_to?.includes(activeProfile.id)
      );
      setHasMyMepData(hasMyMep);

      const hasTeamMep = allTasks.length > 0; // of specifieker als je wilt
      setHasTeamMepData(hasTeamMep);

      const hasOutOfStock = allTasks.some((task) => task.status === "out of stock");
      setHasOutOfStockData(hasOutOfStock);

      const hasNoStatus = allTasks.some((task) => task.status === "inactive");
      setHasNoStatusData(hasNoStatus);

      // 3️⃣ Update sections in state (voor weergave in SectionItems)
      setSections(mergedSections);
      // console.log("▶ setting sections + stats state");

      // 4️⃣ Haal statistieken direct vanuit Supabase (zoals helpers zijn ontworpen)
      const allPct = await fetchAllDonePercentage(selectedDate, kitchenId);
      setAllPercentage(allPct);

      if (activeProfile) {
        const myMepCount = await fetchMyTasksCount(activeProfile.id, selectedDate, kitchenId);
        setMyMepCount(myMepCount);
      }

      const teamCount = await fetchActiveTasksCount(selectedDate, kitchenId);
      setTeamMepCount(teamCount);

      const outStockCount = await fetchOutOfStockTasksCount(selectedDate, kitchenId);
      setOutOfStockCount(outStockCount);

      const noStatusCount = allTasks.filter((task) => task.status === "inactive").length;
      setNoStatusCount(noStatusCount);

      const activeCountPerSection = await fetchActiveCountPerSection(kitchenId, selectedDate);
      setActiveTasksCountPerSection(activeCountPerSection);

      // console.log("▶ stats state set");
    } catch (error: any) {
      console.error("Error loading sections + stats:", error);
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

  /* Verander de geselecteerde datum (bijvoorbeeld vanuit een DateSelector component) */
  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
  }
  /* Functie: Druk op een sectie in de lijst */
  function handlePressSection(sectionId: string) {
    router.push(`/sections/${sectionId}`);
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

  /* Deze modal ook reusable component maken */
  const renderAddSectionModal = () => {
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
              <AppText style={styles.modalTitle}>Nieuw menu-item</AppText>

              <TextInput
                style={styles.input}
                placeholder="menu-item"
                value={newSectionName}
                onChangeText={setNewSectionName}
                autoCorrect={false}
              />

              {/* Kiezen van startdatum */}
              <AppText style={styles.label}>Startdatum</AppText>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowStartDatePicker(true)}>
                <AppText style={styles.datePickerText}>{formatDateString(newSectionStartDate)}</AppText>
              </TouchableOpacity>

              {/* Kiezen van einddatum */}
              <AppText style={styles.label}>Einddatum</AppText>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowEndDatePicker(true)}>
                <AppText style={styles.datePickerText}>{formatDateString(newSectionEndDate)}</AppText>
              </TouchableOpacity>

              {/* Opslaan */}
              <TouchableOpacity style={styles.saveButton} onPress={handleCreateSection}>
                <AppText style={styles.saveButtonText}>Opslaan</AppText>
              </TouchableOpacity>

              {/* Annuleren */}
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <AppText style={styles.cancelButtonText}>Annuleren</AppText>
              </TouchableOpacity>

              {/* Startdatum CalendarModal */}
              <CalendarModal
                visible={showStartDatePicker}
                selectedDate={newSectionStartDate}
                onClose={() => setShowStartDatePicker(false)}
                onSelectDate={(date) => {
                  setNewSectionStartDate(date);
                  if (!newSectionEndDate)
                    setNewSectionEndDate(date); /* Als einddatum nog leeg is, zet gelijk */
                  setShowStartDatePicker(false);
                }}
              />

              {/* Einddatum CalendarModal */}
              <CalendarModal
                visible={showEndDatePicker}
                selectedDate={newSectionEndDate}
                onClose={() => setShowEndDatePicker(false)}
                onSelectDate={(date) => {
                  setNewSectionEndDate(date);
                  setShowEndDatePicker(false);
                }}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  if (loading || loadingSections) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <AppText>Loading...</AppText>
      </View>
    );
  }

  const tabTitles = {
    allTasks: "All",
    teamMep: "Team MEP",
    myMep: "My MEP",
    outOfStock: "Out of Stock",
    noStatus: "No Status",
  };
  const activeTabTitle = tabTitles[activeTab];

  return (
    <View style={[styles.container, isTabletLandscape && styles.containerTablet]}>
      {/* ----------- Linker Kolom (alleen zichtbaar als niet collapsed) ----------- */}
      {!isTabletLandscape || !isSidebarCollapsed ? (
        <View style={styles.leftColumn}>
          {/* Header */}
          <View style={[styles.header, isTabletLandscape && styles.headerTablet]}>
            <Image
              source={require("../assets/images/KITCHENMONKSLOGOX.png")}
              style={[styles.logo, isTabletLandscape && styles.logoTablet]}
            />
            <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} />

            {/* Menu toggle icoon (alleen tablet) */}
            {isTabletLandscape && (
              <TouchableOpacity
                onPress={() => setSidebarCollapsed((prev) => !prev)}
                style={styles.menuToggle}
              >
                <Ionicons name="menu" size={24} color="#333" />
              </TouchableOpacity>
            )}

            {/* Avatar (alleen mobiel zichtbaar in linker header) */}
            {!isTabletLandscape && (
              <TouchableOpacity onPress={() => router.push("/profile/menu")}>
                {activeProfile ? (
                  <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
                    <AppText style={styles.avatarText}>{initials}</AppText>
                  </View>
                ) : (
                  <Image source={require("../assets/images/ExampleAvatar.png")} style={styles.avatar} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* StatsSection voor mobiel EN in de sidebar op tablet view */}
          <View style={{ width: "100%" }}>
            <StatsSection
              allPercentage={allPercentage}
              teamMepCount={teamMepCount}
              myMepCount={myMepCount}
              outOfStockCount={outOfStockCount}
              noStatusCount={noStatusCount}
              hasMyMepData={hasMyMepData}
              hasTeamMepData={hasTeamMepData}
              hasOutOfStockData={hasOutOfStockData}
              hasNoStatusData={hasNoStatusData}
              hasAllData={hasAllData}
              isTablet={isTabletLandscape}
              activeTab={activeTab}
              onTabSelect={(tab) =>
                setActiveTab(tab as "allTasks" | "teamMep" | "myMep" | "outOfStock" | "noStatus")
              }
            />
          </View>

          {/* SectionItems voor mobiel EN in de sidebar op tablet view */}
          <View style={[styles.listContainer, isTabletLandscape && styles.listContainerTablet]}>
            <TouchableOpacity
              style={[styles.addSectionButton, isTabletLandscape && styles.addSectionButtonTablet]}
              onPress={() => setShowAddModal(true)}
            >
              <View style={[styles.plusCircle, isTabletLandscape && styles.plusCircleTablet]}>
                <Ionicons name="add" size={15} style={{ opacity: 0.5, color: "#333" }} />
              </View>
              <AppText style={[styles.addSectionText, isTabletLandscape && styles.addSectionTextTablet]}>
                Voeg menu-item toe
              </AppText>
            </TouchableOpacity>

            <SectionItems
              sections={sections}
              onPressSection={handlePressSection}
              activeTasksCountPerSection={activeTasksCountPerSection}
            />
          </View>

          {renderAddSectionModal()}
        </View>
      ) : null}

      {/* ----------- Rechter Kolom (alleen op tablet) ----------- */}
      {isTabletLandscape && (
        <View style={styles.rightColumn}>
          {/* Rechter header */}
          <View style={styles.rightColumnHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              {/* Menu toggle icoon alleen als sidebar collapsed is */}
              {isSidebarCollapsed && (
                <TouchableOpacity onPress={() => setSidebarCollapsed(false)}>
                  <Ionicons name="menu" size={24} color="#333" />
                </TouchableOpacity>
              )}

              {/* Titel altijd zichtbaar links in de rij */}
              <AppText style={styles.headerText}>{activeTabTitle}</AppText>
            </View>

            {/* Avatar ALTIJD rechtsboven in tablet-view */}
            <TouchableOpacity onPress={() => router.push("/profile/menu")}>
              {activeProfile ? (
                <View style={[styles.avatarCircleTablet, { backgroundColor: avatarColor }]}>
                  <AppText style={styles.avatarTextTablet}>{initials}</AppText>
                </View>
              ) : (
                <Image source={require("../assets/images/ExampleAvatar.png")} style={styles.avatarTablet} />
              )}
            </TouchableOpacity>
          </View>

          {/* Dynamische tab-content */}
          {activeTab === "allTasks" && <AllTasksTabletView />}
          {activeTab === "teamMep" && <TeamMepTabletView />}
          {activeTab === "myMep" && <MyMepTabletView />}
          {activeTab === "outOfStock" && <OutOfStockTabletView />}
          {activeTab === "noStatus" && <NoStatusTabletView />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    paddingHorizontal: 22,
    paddingVertical: Platform.select({
      ios: 60,
      android: 35,
    }),
  },
  containerTablet: {
    flexDirection: "row",
    paddingHorizontal: 40,
    paddingTop: 35,
    backgroundColor: "#f6f6f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // -- Modal styling  -> Modal moet ook in een reusable component & styling moet gescheiden zijn van beide views --
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
    fontSize: 16,
    marginBottom: 12,
    color: "#333",
  },
  input: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    backgroundColor: "#f2f2f2",
  },
  label: {
    marginTop: 10,
    fontSize: 14,
    color: "#333",
  },
  datePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    marginTop: 4,
    backgroundColor: "#f2f2f2",
  },
  datePickerText: {
    fontSize: 14,
    color: "#333",
  },
  saveButton: {
    alignItems: "center",
    padding: 10,
    marginBottom: 8,
    borderRadius: 6,
    backgroundColor: "#6C63FF",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  cancelButton: { padding: 10, alignItems: "center" },
  cancelButtonText: { color: "#666" },

  addSectionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginVertical: 6,
  },
  plusCircle: {
    width: 28,
    height: 28,
    marginRight: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  addSectionText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    opacity: 0.8,
  },

  // -- Linker Kolom styling (mobiel) --
  leftColumn: {
    flex: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Platform.select({
      ios: 10,
      android: 5,
    }),
    paddingVertical: Platform.select({
      ios: 10,
    }),
    marginTop: Platform.select({
      ios: 10,
    }),
  },
  headerTablet: {
    // marginVertical: 24,
  },

  logo: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  avatarCircle: {
    width: Platform.select({
      ios: 34,
      android: 30,
    }),
    height: Platform.select({
      ios: 34,
      android: 30,
    }),
    borderRadius: Platform.select({
      ios: 17,
      android: 15,
    }),
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  avatar: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  menuToggle: {
    padding: 10,
  },
  listContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 18,
    borderWidth: 0.5,
    height: "auto",
    borderColor: "rgba(0, 0, 0, 0.1)",
    backgroundColor: "#ffffff",
  },

  // -- Rechter Kolom styling --
  rightColumn: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },
  rightColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    // marginVertical: 24,
  },

  headerText: {
    fontSize: 23,
    fontWeight: "bold",
    marginLeft: 24,
  },
  logoTablet: {
    width: 40,
    height: 40,
  },
  avatarCircleTablet: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTextTablet: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  avatarTablet: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  listContainerTablet: {
    width: "100%",
    height: "auto",
    paddingVertical: 12.5,
  },
  addSectionButtonTablet: {
    marginVertical: 12,
  },
  plusCircleTablet: {
    // marginRight: 12.5,
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  addSectionTextTablet: {
    fontSize: 18,
    color: "#666",
    opacity: 0.8,
  },
});
