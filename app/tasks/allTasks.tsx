import React, { useState, useEffect, useContext } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Pressable,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { ProfileData } from "@/services/ProfileContext";
import { deleteSectionWithCheck, fetchSections, updateSection } from "@/services/api/sections";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers";
import { fetchProfiles } from "@/services/api/profiles";
import useTaskModal, { TaskRow, SectionData } from "@/hooks/useTaskModal";
import { cleanTaskName, generateInitials, getColorFromId } from "@/utils/taskUtils";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import { STATUS_META, StatusMeta } from "@/constants/statusMeta";
import AppText from "@/components/AppText";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AllTasksScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { selectedDate } = useContext(DateContext);
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

  /* 1) laadt de secties + ALLE taken voor elke sectie (geen status‑filter) */
  useEffect(() => {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;
    loadData(kitchenId);
  }, [user, selectedDate]);

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

  /* 2) laadt de secties + ALLE taken voor elke sectie (geen status‑filter) */
  async function loadData(kitchenId: string) {
    setLoading(true);
    try {
      // a) alle secties ophalen
      const secs = await fetchSections(kitchenId, selectedDate);

      // b) voor elke sectie: haal *alle* task‑instances op voor de selectedDate
      const merged: SectionData[] = await Promise.all(
        secs.map(async (sec: any) => {
          const allTasks = await getTasksForSectionOnDate(sec.id, selectedDate);

          // voeg sectie‑metadata toe aan elk task‑object
          const tasksWithSection: TaskRow[] = allTasks.map((t: any) => ({
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

      // c) optioneel: filter empty sections weg
      setSections(merged.filter((sec) => sec.tasks.length > 0));
    } catch (error: any) {
      console.error("Error loading all tasks:", error);
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
      {/* Back button & headerText */}
      <View style={styles.backButtonHeaderContainer}>
        <TouchableOpacity style={styles.backButtonCircle} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={14} color="#333" />
        </TouchableOpacity>
        <AppText style={styles.headerText}>All</AppText>
      </View>

      {/* FlatList met secties en taken (gefiltered op done/in progress) */}
      <FlatList
        data={sections}
        keyExtractor={(sec) => sec.id}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
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
    flex: 1,
    backgroundColor: "#f6f6f6",
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
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#fff",
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },

  /* Tasks */
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 6,
    padding: 10,
    borderRadius: 6,
  },
  taskStatusCircleContainer: {
    width: 1,
    alignItems: "center",
    marginRight: 26,
  },
  taskStatusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTextContainer: {
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  doneText: {
    color: "#000",
    fontWeight: "700",
  },
  inactiveText: {
    color: "#666",
  },
  assignedBubbles: {
    flexDirection: "row",
    marginLeft: 8,
  },
  bubbleSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleSmallText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // -- Modal styling --
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  modalContent: {
    backgroundColor: "#fff",
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
});
