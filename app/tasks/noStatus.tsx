import React, { useState, useEffect, useContext, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, Pressable, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { ProfileData } from "@/services/ProfileContext";
import { fetchSections } from "@/services/api/sections";
import { fetchTaskInstancesWithSection, getTasksForSectionOnDate } from "@/services/api/taskHelpers";
import { fetchProfiles } from "@/services/api/profiles";
import useTaskModal, { TaskRow, SectionData } from "@/hooks/useTaskModal";
import { cleanTaskName, generateInitials, getColorFromId } from "@/utils/taskUtils";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import { STATUS_META, StatusMeta } from "@/constants/statusMeta";
import AppText from "@/components/AppText";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import LoadingSpinner from "@/components/LoadingSpinner";
import { fetchInactiveTaskInstancesWithSection } from "@/services/api/taskInstances";

export default function NoStatusScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { selectedDate } = useContext(DateContext);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);

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
    handleDeleteTask,
  } = useTaskModal({ sections, setSections });

  /* ------------------------------------------------------------ */

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

  /* ------------------------------------------------------------ */

  // const loadData = useCallback(async () => {
  //   if (!user) return;
  //   const kitchenId = user.user_metadata?.kitchen_id;
  //   if (!kitchenId) return;

  //   setLoading(true);
  //   try {
  //     // 1) Haal alle secties van deze keuken
  //     const secs = await fetchSections(kitchenId, selectedDate);

  //     // 2) Haal alle taken op voor deze datum + keuken
  //     const allInstances = await fetchTaskInstancesWithSection(selectedDate, kitchenId);

  //     // 3) Filter taken met status 'inactive'
  //     const inactiveTasks = allInstances
  //       .filter((t: any) => t.status === "inactive")
  //       .map((t: any) => ({
  //         ...t,
  //         task_name: t.task_template?.task_name ?? "Onbekend",
  //         section: t.task_template?.section ?? {},
  //         section_id: t.task_template?.section?.id ?? null,
  //       }));

  //     // 4) Groepeer per sectie
  //     const grouped: SectionData[] = secs.map((sec: any) => {
  //       const tasks = inactiveTasks
  //         .filter((t: any) => t.section_id === sec.id)
  //         .map((t: any) => ({
  //           ...t,
  //           section: {
  //             id: sec.id,
  //             section_name: sec.section_name,
  //             start_date: sec.start_date,
  //             end_date: sec.end_date,
  //           },
  //         }));

  //       return {
  //         id: sec.id,
  //         section_name: sec.section_name,
  //         start_date: sec.start_date,
  //         end_date: sec.end_date,
  //         tasks,
  //       };
  //     });

  //     // 5) Alleen secties met taken tonen
  //     setSections(grouped.filter((s) => s.tasks.length > 0));
  //   } catch (err) {
  //     console.error("Error loading No Status tasks:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [user, selectedDate]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;

    setLoading(true);
    try {
      // 1. Haal alle secties op
      const secs = await fetchSections(kitchenId, selectedDate);

      // 2. Haal alle 'inactive' taken met section-meta in 1 call
      const inactiveTasks = await fetchInactiveTaskInstancesWithSection(selectedDate, kitchenId);

      // 3. Groepeer per section
      const grouped: SectionData[] = secs.map((sec: any) => {
        const tasks = inactiveTasks
          .filter((t: any) => t.task_template?.section?.id === sec.id)
          .map((t: any) => ({
            ...t,
            task_name: t.task_template.task_name,
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
          tasks,
        };
      });

      // 4. Alleen secties met taken tonen
      setSections(grouped.filter((s) => s.tasks.length > 0));
    } catch (err) {
      console.error("Error loading No Status tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user, selectedDate])
  );

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
        <AppText style={styles.headerText}>No status</AppText>
      </View>

      {/* FlatList met secties en hun taken (gefilterd op activeProfile) */}
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
        handleDeleteTask={handleDeleteTask}
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

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
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
});
