import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { ProfileContext, ProfileData } from "@/services/ProfileContext";
import { fetchSections } from "@/services/api/sections";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers";
import { fetchProfiles } from "@/services/api/profiles";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import AppText from "@/components/AppText";
import useTaskModal from "@/hooks/useTaskModal";
import { TaskRow, SectionData } from "@/hooks/useTaskModal";
import { cleanTaskName, generateInitials, getColorFromId } from "@/utils/taskUtils";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import { STATUS_META, StatusMeta } from "@/constants/statusMeta";
import LoadingSpinner from "./LoadingSpinner";

export default function MyMepTabletView() {
  const { user } = useContext(AuthContext);
  const { selectedDate } = useContext(DateContext);
  const { activeProfile } = useContext(ProfileContext);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);

  /* Haal eerst de profielen op zodra de user beschikbaar is */
  useEffect(() => {
    async function loadProfiles() {
      if (!user) return;
      const kitchenId = user.user_metadata?.kitchen_id;
      if (!kitchenId) return;
      try {
        const profilesData = await fetchProfiles(kitchenId);
        setAllProfiles(profilesData);
      } catch (error) {
        console.error("Error loading profiles for assignment:", error);
      }
    }
    loadProfiles();
  }, [user]);

  /* Laad de secties en per sectie de taakinstances voor de geselecteerde datum */
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const {
    selectedTask,
    showDetailsModal,
    openModal,
    closeModal,
    handleToggleAssignTask,
    handleSetDone,
    handleSetInProgress,
    handleSetActiveTask,
    handleSetInactiveTask,
    handleSetOutOfStock,
    handleEditTask,
    handleSetSkip,
  } = useTaskModal({ sections, setSections });

  /* loadData:
  - Haal alle secties op voor de keuken
  - Voor elke sectie: haal de taken op voor de geselecteerde datum
  - Filter de taken: toon alleen taken waarvoor de actieve profiel-ID voorkomt in de assigned_to array
  - Voeg de parent sectie-gegevens toe aan elke taak zodat deze beschikbaar zijn voor de modal
  */
  async function loadData() {
    if (!user || !activeProfile) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;

    setLoading(true);
    try {
      // 1) Haal alle secties op voor de keuken (datumfilter niet toepassen, want secties vormen de vaste menukaart)
      const secs = await fetchSections(kitchenId, selectedDate);

      // 2) Voor elke sectie: haal de taken op voor de geselecteerde datum en voeg de section-data toe
      const merged: SectionData[] = await Promise.all(
        secs.map(async (sec: any) => {
          // Haal de taken op voor de sectie via de helper functie
          const allTasks = await getTasksForSectionOnDate(sec.id, selectedDate);
          // Filter de taken: toon alleen taken waarvoor de actieve profiel-ID voorkomt in de assigned_to array
          const filteredTasks = allTasks.filter((task: TaskRow) => {
            return task.assigned_to?.includes(activeProfile.id);
          });
          // Voeg de parent sectie-gegevens toe aan elke taak zodat deze beschikbaar zijn voor de modal
          const tasksWithSection = filteredTasks.map((t: any) => ({
            ...t,
            section: {
              id: sec.id,
              section_name: sec.section_name,
              start_date: sec.start_date,
              end_date: sec.end_date,
            },
          }));
          return {
            id: sec.id,
            section_name: sec.section_name,
            start_date: sec.start_date,
            end_date: sec.end_date,
            tasks: tasksWithSection,
          };
        })
      );
      // Optioneel: Filter secties waar geen enkele taak is toegewezen aan activeProfile
      const sectionsWithTasks = merged.filter((sec) => sec.tasks.length > 0);
      setSections(sectionsWithTasks);
    } catch (error) {
      console.log("Error loading my tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  /* Handle the circle press */
  const handleCirclePress = async (task: TaskRow) => {
    await handleSetDone();
    openModal({ ...task, status: "done" });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* FlatList met secties en hun taken (gefilterd op activeProfile) */}
      <FlatList
        data={sections}
        keyExtractor={(sec) => sec.id}
        horizontal // → zorgt voor horizontaal scrollen
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: sec }) => (
          <View style={styles.sectionContainer}>
            <AppText style={styles.sectionTitle}>{sec.section_name}</AppText>

            {sec.tasks.map((task) => {
              const meta = (STATUS_META[task.status as keyof typeof STATUS_META] || {
                backgroundColor: "transparent",
                borderColor: "#ccc",
              }) as StatusMeta;

              return (
                <View key={task.id} style={styles.taskItemRow}>
                  {/* 1) Cirkel links */}
                  <Pressable onPress={() => handleCirclePress(task)} style={styles.taskStatusCircleContainer}>
                    <View
                      style={[
                        styles.taskStatusCircle,
                        { backgroundColor: meta.backgroundColor },
                        meta.borderColor ? { borderWidth: 1, borderColor: meta.borderColor } : {},
                      ]}
                    >
                      {meta.icon && <Ionicons name={meta.icon} size={12} color={meta.iconColor} />}
                    </View>
                  </Pressable>

                  {/* 2) Resterende (taak)rij opent modal */}
                  <Pressable style={styles.taskTextContainer} onPress={() => openModal(task)}>
                    <AppText
                      style={[
                        styles.taskText,
                        task.status === "done" ? styles.doneText : styles.inactiveText,
                      ]}
                    >
                      {cleanTaskName(task.task_name)}
                    </AppText>
                  </Pressable>

                  {/* 3) kleine assigned‑thumbnails */}
                  <View style={styles.assignedBubbles}>
                    {task.assigned_to?.map((pid) => {
                      const prof = allProfiles.find((p) => p.id === pid);
                      if (!prof) return null;
                      const initials = generateInitials(prof.first_name, prof.last_name);
                      const bg = getColorFromId(prof.id);
                      return (
                        <View key={pid} style={[styles.bubbleSmall, { backgroundColor: bg }]}>
                          <AppText style={styles.bubbleSmallText}>{initials}</AppText>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      />

      {/* --- Modal: Taakdetails --- */}
      <TaskDetailsModal
        visible={showDetailsModal}
        selectedTask={selectedTask}
        allProfiles={allProfiles}
        STATUS_META={STATUS_META}
        cleanTaskName={cleanTaskName}
        closeModal={closeModal}
        generateInitials={generateInitials}
        getColorFromId={getColorFromId}
        onAssignToggle={handleToggleAssignTask}
        onSetDone={handleSetDone}
        onSetInProgress={handleSetInProgress}
        onSetActive={handleSetActiveTask}
        onSetInactive={handleSetInactiveTask}
        onSetOutOfStock={handleSetOutOfStock}
        onSetSkip={handleSetSkip}
        handleEditTask={handleEditTask}
        onClose={closeModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // marginVertical: 26,
    backgroundColor: "#f6f6f6",
  },

  sectionContainer: {
    width: 325,
    height: "auto",
    marginHorizontal: 24,
    marginVertical: 32,
    // marginBottom: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#fff",
  },
  sectionTitle: { fontSize: 21, fontWeight: "bold", marginBottom: 9 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    padding: 10,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  taskStatusCircleContainer: {
    width: 1,
    alignItems: "center",
    marginRight: 26,
  },
  taskStatusCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTextContainer: {
    flex: 1,
  },
  taskText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "500",
  },
  doneText: {
    color: "#000",
    fontWeight: "700",
  },
  inactiveText: {
    color: "#666",
    fontWeight: "500",
    opacity: 0.8,
  },
  assignedBubbles: {
    flexDirection: "row",
    marginLeft: 8,
  },
  bubbleSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleSmallText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
});
