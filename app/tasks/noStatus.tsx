import React, { useState, useEffect, useContext, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { ProfileData } from "@/services/ProfileContext";
import { fetchSections } from "@/services/api/sections";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers";
import { fetchProfiles } from "@/services/api/profiles";
import useTaskModal, { TaskRow, SectionData } from "@/hooks/useTaskModal";
import { cleanTaskName, generateInitials, getColorFromId } from "@/utils/taskUtils";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import { STATUS_META, StatusMeta } from "@/constants/statusMeta";
import AppText from "@/components/AppText";
import Ionicons from "@expo/vector-icons/build/Ionicons";

export default function NoStatusScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { selectedDate } = useContext(DateContext);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);
  const flatListRef = useRef<FlatList>(null);

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
    handleSetSkip,
    handleEditTask,
  } = useTaskModal({ sections, setSections });

  useEffect(() => {
    if (selectedTask) {
      scrollToSelectedTask();
    }
  }, [selectedTask]);

  const scrollToSelectedTask = () => {
    let index = 0;
    let found = false;
    sections.forEach((section) => {
      section.tasks.forEach((task) => {
        if (task.id === selectedTask?.id) {
          found = true;
        }
        if (!found) index++;
      });
    });
    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  };

  async function loadData() {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;

    setLoading(true);
    try {
      // 1️⃣ Haal alle secties op voor de keuken
      const secs = await fetchSections(kitchenId, selectedDate);

      // 2️⃣ Voor elke sectie: haal de taken op voor de geselecteerde datum en filter op 'inactive'
      const merged: SectionData[] = await Promise.all(
        secs.map(async (sec: any) => {
          const allTasks = await getTasksForSectionOnDate(sec.id, selectedDate);

          // Filter alleen taken met status 'inactive'
          const filteredTasks = allTasks.filter((task: TaskRow) => task.status === "inactive");

          // Voeg section-data toe aan elke taak
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

      // 3️⃣ Filter secties waar minstens één taak overblijft
      const sectionsWithTasks = merged.filter((sec) => sec.tasks.length > 0);

      // 4️⃣ Zet de state
      setSections(sectionsWithTasks);
    } catch (error) {
      console.error("Error loading no status tasks:", error);
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
        <AppText>Loading my tasks for {selectedDate}...</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AppText style={styles.headerText}>No status</AppText>
      </View>

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <View style={styles.backButtonCircle}>
            <Ionicons name="chevron-back" size={14} color="#333" />
          </View>
        </TouchableOpacity>
      </View>

      {/* FlatList met secties en hun taken (gefilterd op activeProfile) */}
      <FlatList
        data={sections}
        keyExtractor={(sec) => sec.id}
        renderItem={({ item: sec }) => (
          <View style={styles.sectionContainer}>
            <AppText style={styles.sectionTitle}>{sec.section_name}</AppText>

            {sec.tasks.map((task) => {
              const meta = (STATUS_META[task.status as keyof typeof STATUS_META] || {
                backgroundColor: "transparent",
                borderColor: "#ccc",
              }) as StatusMeta;

              const isSelected = selectedTask?.id === task.id;

              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskItemRow,
                    // isSelected && styles.taskItemSelected,
                  ]}
                >
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
        onClose={closeModal}
        selectedTask={selectedTask}
        allProfiles={allProfiles}
        STATUS_META={STATUS_META}
        onAssignToggle={handleToggleAssignTask}
        onSetDone={handleSetDone}
        onSetInProgress={handleSetInProgress}
        onSetActive={handleSetActiveTask}
        onSetInactive={handleSetInactiveTask}
        onSetOutOfStock={handleSetOutOfStock}
        onEditTask={handleEditTask}
        onSetSkip={handleSetSkip}
        cleanTaskName={cleanTaskName}
        generateInitials={generateInitials}
        getColorFromId={getColorFromId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    paddingVertical: Platform.select({
      ios: 85,
      android: 35,
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButtonCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0e0e0dc", // zachtgrijs
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 8 },
  headerText: { fontSize: 18, fontWeight: "bold" },
  backButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
  backText: { fontSize: 17, color: "#666", marginLeft: 4 },

  // -- De secties op het hoofdscherm --
  sectionContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  addTaskButton: { marginTop: 16, paddingVertical: 0 },
  addTaskText: { color: "#666" },

  // modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, color: "#333" },
  // modalTaskTitle: {
  //   fontSize: 18,
  //   fontWeight: "bold",
  //   color: "#333",
  //   textAlign: "center",
  //   marginBottom: 10,
  // },

  saveButton: {
    backgroundColor: "#6C63FF",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  cancelButton: { padding: 10, alignItems: "center" },

  // -- Assign to styling --
  profileBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#bbb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 8,
  },
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
  // taskItemSelected: {
  //   borderWidth: 2,
  //   borderColor: "#2e8b57", // groene accentkleur of jouw voorkeur
  //   borderRadius: 8,
  // },
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

  statusOval: {
    flex: 1, // zodat ze even breed worden
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 0,
    borderRadius: 50,
    backgroundColor: "#f2f2f2",
  },
});
