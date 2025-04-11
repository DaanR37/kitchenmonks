import React, { useState, useEffect, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { ProfileContext } from "@/services/ProfileContext";
import { fetchSections } from "@/services/api/sections";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers";
import {
  updateTaskInstanceInProgress,
  updateTaskInstanceDone,
  updateTaskInstanceStatus,
  assignTaskInstance,
} from "@/services/api/taskInstances";
import { fetchProfiles } from "@/services/api/profiles";

export type TaskRow = {
  id: string;
  task_name: string;
  status: string;
  date: string;
  assigned_to?: string[];
  task_template_id: string;
  section_id: string;
  section: {
    id: string;
    section_name: string;
    start_date?: string;
    end_date?: string;
  };
};

export type SectionData = {
  id: string;
  section_name: string;
  start_date: string;
  end_date: string;
  tasks: TaskRow[];
};

export type ProfileData = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function AllTasksScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { selectedDate } = useContext(DateContext);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
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

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  /* Data Fetch: Alle taken uit de hele keuken met status in progress of done */
  async function loadData() {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;

    setLoading(true);
    try {
      // 1) Haal alle secties op (zonder datumfilter).
      const secs = await fetchSections(kitchenId);

      // 2) Voor elke sectie: haal ALLE taken (instances) op voor de selectedDate.
      //    Filter ze daarna zodanig dat alleen tasks met "in progress" of "done" overblijven.
      const merged: SectionData[] = await Promise.all(
        secs.map(async (sec: any) => {
          const allTasks = await getTasksForSectionOnDate(sec.id, selectedDate);

          // Filter: we laten alleen taken zien die "in progress" of "done" zijn.
          const filteredTasks = allTasks.filter(
            (task: TaskRow) => task.status === "in progress" || task.status === "done"
          );

          // Voeg de sectie-data toe aan elk task-object.
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

      // Filter secties zonder taken (optioneel)
      const sectionsWithTasks = merged.filter((s) => s.tasks.length > 0);
      setSections(sectionsWithTasks);
    } catch (error) {
      console.log("Error loading all tasks (in progress/done):", error);
    } finally {
      setLoading(false);
    }
  }
  /* Handle the toggle of task assignments */
  async function handleToggleAssignTask(profileId: string) {
    if (!selectedTask) return;
    if (!selectedTask.section) {
      console.log("Selected task mist section data.");
      return;
    }

    let currentAssignments: string[] = selectedTask.assigned_to ? [...selectedTask.assigned_to] : [];
    const isAssigned = currentAssignments.includes(profileId);
    if (isAssigned) {
      // Verwijder het profiel als het al is toegewezen
      currentAssignments = currentAssignments.filter((id) => id !== profileId);
    } else {
      // Voeg het profiel toe als het nog niet is toegewezen
      currentAssignments.push(profileId);
    }
    // Als er ten minste één profiel is toegewezen, moet de taak 'active' zijn, anders 'inactive'
    const newStatus = currentAssignments.length > 0 ? "active" : "inactive";
    try {
      await assignTaskInstance(selectedTask.id, currentAssignments);
      await updateTaskInstanceStatus(selectedTask.id, newStatus);
      // Werk lokale state bij voor zowel de secties als de geselecteerde taak
      const updatedSections = sections.map((sec) => {
        if (sec.id !== selectedTask.section.id) return sec;
        return {
          ...sec,
          tasks: sec.tasks.map((t) =>
            t.id === selectedTask.id ? { ...t, assigned_to: currentAssignments, status: newStatus } : t
          ),
        };
      });
      setSections(updatedSections);
      setSelectedTask({ ...selectedTask, assigned_to: currentAssignments, status: newStatus });
    } catch (error) {
      console.log("Error updating assignment/status:", error);
    }
  }
  /* Zet de taak op "in progress" */
  async function handleSetInProgress() {
    if (!selectedTask) return;
    try {
      await updateTaskInstanceInProgress(selectedTask.id);

      const updatedSections = sections.map((sec) => {
        if (sec.id !== selectedTask.section.id) return sec;
        return {
          ...sec,
          tasks: sec.tasks.map((t) => (t.id === selectedTask.id ? { ...t, status: "in progress" } : t)),
        };
      });
      setSections(updatedSections);

      setSelectedTask({ ...selectedTask, status: "in progress" });
    } catch (error) {
      console.log("Error setting in progress:", error);
    }
  }
  /* Zet de taak op "done" */
  async function handleSetDone() {
    if (!selectedTask) return;
    try {
      await updateTaskInstanceDone(selectedTask.id);

      const updatedSections = sections.map((sec) => {
        if (sec.id !== selectedTask.section.id) return sec;
        return {
          ...sec,
          tasks: sec.tasks.map((t) => (t.id === selectedTask.id ? { ...t, status: "done" } : t)),
        };
      });
      setSections(updatedSections);

      setSelectedTask({ ...selectedTask, status: "done" });
    } catch (error) {
      console.log("Error setting done:", error);
    }
  }
  /* Open de details modal voor een taak */
  function openTaskDetailsModal(task: TaskRow) {
    setSelectedTask(task);
    setShowDetailsModal(true);
  }
  /* Sluit de details modal */
  function closeTaskDetailsModal() {
    setSelectedTask(null);
    setShowDetailsModal(false);
  }

  function cleanTaskName(fullName: string): string {
    const parts = fullName.split(" ");
    const lastPart = parts[parts.length - 1];
    if (/^\d{10,}$/.test(lastPart)) {
      parts.pop();
      return parts.join(" ");
    }
    return fullName;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading my tasks for {selectedDate}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{"<"} All tasks</Text>
        </TouchableOpacity>
      </View>

      {/* FlatList met secties en taken (gefilterd op done/in progress) */}
      <FlatList
        data={sections}
        keyExtractor={(sec) => sec.id}
        renderItem={({ item: sec }) => (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{sec.section_name}</Text>
            {sec.tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskItem}
                onPress={() => openTaskDetailsModal(task)}
              >
                <Text style={{ color: task.status === "done" ? "#000" : "#666" }}>
                  {cleanTaskName(task.task_name)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      {/* --- Modal: Taakdetails --- */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={closeTaskDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomModalContainer}>
            {selectedTask && (
              <>
                {/* Titel: Taaknaam */}
                <Text style={styles.modalTaskTitle}>{cleanTaskName(selectedTask.task_name)}</Text>

                {/* “Assign to” en thumbnail-bubbels */}
                <View style={styles.assignContainer}>
                  <Text style={styles.assignTitle}>Assign to:</Text>

                  <View style={styles.profileBubblesContainer}>
                    {allProfiles.map((profile) => {
                      const initials =
                        profile.first_name.charAt(0).toUpperCase() +
                        profile.last_name.charAt(0).toUpperCase();
                      const isAssigned = selectedTask.assigned_to?.includes(profile.id);

                      return (
                        <TouchableOpacity
                          key={profile.id}
                          style={[styles.profileBubble, isAssigned && styles.profileBubbleSelected]}
                          onPress={() => handleToggleAssignTask(profile.id)}
                        >
                          <Text style={styles.profileBubbleText}>{initials}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Status in 2x3 layout */}
                <View style={styles.statusContainer}>
                  {/* Rij 1: In progress / Done */}
                  <View style={styles.statusRow}>
                    {/* In progress-knop */}
                    <TouchableOpacity
                      style={[
                        styles.statusBox,
                        selectedTask.status === "in progress" && styles.statusBoxInProgress,
                      ]}
                      onPress={handleSetInProgress}
                    >
                      <Text
                        style={[
                          styles.statusBoxText,
                          selectedTask.status === "in progress" && styles.statusBoxTextSelected,
                        ]}
                      >
                        In progress
                      </Text>
                    </TouchableOpacity>

                    {/* Done-knop */}
                    <TouchableOpacity
                      style={[styles.statusBox, selectedTask.status === "done" && styles.statusBoxDone]}
                      onPress={handleSetDone}
                    >
                      <Text
                        style={[
                          styles.statusBoxText,
                          selectedTask.status === "done" && styles.statusBoxTextSelected,
                        ]}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Rij 2: Don't do / Out of stock */}
                  <View style={styles.statusRow}>
                    {/* Don't do-knop - is niet hetzelfde als 'inactive' => wordt enkel en alleen op deze 
                    status gezet, maar blijft 'active' en dus ook in het overzicht staan  */}
                    <TouchableOpacity
                      style={[styles.statusBox, selectedTask.status === "inactive" && styles.statusBoxDontDo]}
                      onPress={async () => {
                        await updateTaskInstanceStatus(selectedTask.id, "inactive");
                        await assignTaskInstance(selectedTask.id, []);
                        // UI bijwerken
                        const updatedSections = sections.map((sec) => {
                          if (sec.id !== selectedTask.section.id) return sec;
                          return {
                            ...sec,
                            tasks: sec.tasks.map((t) =>
                              t.id === selectedTask.id ? { ...t, status: "inactive", assigned_to: [] } : t
                            ),
                          };
                        });
                        setSections(updatedSections);
                        closeTaskDetailsModal();
                      }}
                    >
                      <Text
                        style={[
                          styles.statusBoxText,
                          selectedTask.status === "inactive" && styles.statusBoxTextSelected,
                        ]}
                      >
                        Dont do
                      </Text>
                    </TouchableOpacity>

                    {/* Out of stock-knop */}
                    <TouchableOpacity
                      style={[
                        styles.statusBox,
                        selectedTask.status === "out of stock" && styles.statusBoxOutOfStock,
                      ]}
                      onPress={async () => {
                        await updateTaskInstanceStatus(selectedTask.id, "out of stock");
                        const updatedSections = sections.map((sec) => {
                          if (sec.id !== selectedTask.section.id) return sec;
                          return {
                            ...sec,
                            tasks: sec.tasks.map((t) =>
                              t.id === selectedTask.id ? { ...t, status: "out of stock" } : t
                            ),
                          };
                        });
                        setSections(updatedSections);
                        closeTaskDetailsModal();
                      }}
                    >
                      <Text
                        style={[
                          styles.statusBoxText,
                          selectedTask.status === "out of stock" && styles.statusBoxTextSelected,
                        ]}
                      >
                        Out of stock
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Rij 3: Empty (to do) / Edit-knop (optioneel) */}
                  <View style={styles.statusRow}>
                    <TouchableOpacity style={styles.statusBox} onPress={() => console.log("Empty (to do)")}>
                      <Text style={styles.statusBoxText}>"Empty (to do)"</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statusBox} onPress={() => console.log("Edit")}>
                      <Text style={styles.statusBoxText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Close knop helemaal onderaan */}
                <TouchableOpacity onPress={closeTaskDetailsModal} style={styles.closeButton2}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6", paddingTop: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },
  backText: { color: "#666", fontSize: 16 },

  // -- De secties op het hoofdscherm --
  sectionContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  taskItem: { backgroundColor: "#eee", marginBottom: 6, padding: 10, borderRadius: 6 },
  addTaskButton: { marginTop: 6, paddingVertical: 8 },
  addTaskText: { color: "#666" },

  // -- Modals --
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },

  // De 'onderste' container waarin de inhoud van de modal komt (zoals in je voorbeeld)
  bottomModalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 24, color: "#333" },
  modalTaskTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "left",
    marginBottom: 20,
  },

  input: { backgroundColor: "#f2f2f2", padding: 8, borderRadius: 6, marginBottom: 12 },
  saveButton: {
    backgroundColor: "#6C63FF",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  cancelButton: { padding: 10, alignItems: "center" },

  // -- Assign to styling --
  assignContainer: {
    marginBottom: 24,
  },
  assignTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  profileBubblesContainer: {
    flexDirection: "row",
    flexWrap: "wrap", // zodat de bubbles doorlopen op een nieuwe regel als ze niet passen
  },
  profileBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#bbb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  profileBubbleSelected: {
    backgroundColor: "#6C63FF",
    borderWidth: 2,
    borderColor: "#4838e8",
  },
  profileBubbleText: {
    color: "#fff",
    fontWeight: "bold",
  },

  // 2x3 knoppen layout voor de status
  statusContainer: {
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusBox: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#ddd",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  statusBoxText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "500",
  },

  // Kleuren voor "in progress", "done", "don't do", "out of stock"
  statusBoxInProgress: { backgroundColor: "#F0BB00" }, // of een andere kleur
  statusBoxDone: { backgroundColor: "#4CAF50" },
  statusBoxInactive: { backgroundColor: "#999" },
  statusBoxDontDo: { backgroundColor: "#FF6347" },
  statusBoxOutOfStock: { backgroundColor: "#FF6347" },
  statusBoxTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },

  // Close button
  closeButton2: {
    marginTop: 16,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#333",
    fontSize: 16,
  },
});