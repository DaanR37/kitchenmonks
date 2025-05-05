import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
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

export default function TeamMepTabletView() {
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
  } = useTaskModal({ sections, setSections });

  /*
    loadData:
    1. Controleer of de user en kitchen_id beschikbaar zijn.
    2. Haal alle secties op voor deze keuken via fetchSections.
    3. Voor elke sectie roep je de helperfunctie getTasksForSectionOnDate aan,
       die de geldige task_instances (of indien afwezig, nieuwe instances) ophaalt voor de selectedDate.
    4. Combineer (merge) de secties met hun taken en sla dit op in de lokale state.
  */
  async function loadData() {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;

    setLoading(true);
    try {
      /* 1) Haal alle secties op voor de keuken */
      const secs = await fetchSections(kitchenId, selectedDate);
      /* 2) Voor elke sectie: haal de taken voor de geselecteerde datum op en voeg de section-gegevens (inclusief datums) toe */
      const merged: SectionData[] = await Promise.all(
        secs.map(async (sec: any) => {
          /* Haal de taken op voor deze sectie voor de geselecteerde datum. */
          const allTasks = await getTasksForSectionOnDate(sec.id, selectedDate);

          const tasks = allTasks
            .filter(
              (t) =>
                t.status === "active" ||
                t.status === "in progress" ||
                t.status === "done" ||
                t.status === "out of stock"
            )
            .map((t: any) => ({
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
            tasks,
          } as SectionData;
        })
      );
      // setSections(merged);
      /* drop lege secties */
      setSections(merged.filter((s) => s.tasks.length > 0));
    } catch (error) {
      console.log("Error loading inactive tasks:", error);
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
        <AppText>Loading tasks for {selectedDate}...</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Lijst met secties en hun taken */}
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
