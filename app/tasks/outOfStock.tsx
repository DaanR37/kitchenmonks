import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { ProfileData } from "@/services/ProfileContext";
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

export default function OutOfStockScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { selectedDate } = useContext(DateContext);
  // const { activeProfile } = useContext(ProfileContext);
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
    if (!user) return;
    loadData();
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
  } = useTaskModal({ sections, setSections });

  async function loadData() {
    setLoading(true);
    const kitchenId = user!.user_metadata.kitchen_id;
    const secs = await fetchSections(kitchenId, selectedDate);
    const mapped = await Promise.all(
      secs.map(async (sec) => {
        const tasks = await getTasksForSectionOnDate(sec.id, selectedDate);
        const filtered = tasks.filter((t) => t.status === "out of stock");
        const withSection = filtered.map((t) => ({
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
          tasks: withSection,
        };
      })
    );
    setSections(mapped.filter((s) => s.tasks.length > 0));
    setLoading(false);
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
        <AppText style={styles.headerText}>Out of Stock</AppText>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={14} color="#000" />
        <AppText style={styles.backText}>Back</AppText>
      </TouchableOpacity>

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

                  {/* ③ kleine assigned‑thumbnails */}
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
        cleanTaskName={cleanTaskName}
        generateInitials={generateInitials}
        getColorFromId={getColorFromId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6", paddingTop: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 8 },
  headerText: { fontSize: 18, fontWeight: "bold" },
  backButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
  backText: { fontSize: 17, color: "#666", marginLeft: 4 },

  sectionContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },

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
