import React, { useState, useEffect, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { fetchSections } from "@/services/api/sections";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers";
import {
  updateTaskInstanceStatus,
  assignTaskInstance,
  createTaskInstance,
} from "@/services/api/taskInstances";
import { createTaskTemplate, fetchTaskTemplatesBySection } from "@/services/api/taskTemplates";

/* Types */
export type TaskRow = {
  id: string;
  task_name: string;
  status: string;
  date: string;
  assigned_to?: string | null;
  task_template_id: string;
  section_id: string;
  section: {
    id: string;
    section_name: string;
  };
};

export type SectionData = {
  id: string;
  section_name: string;
  tasks: TaskRow[];
};

export default function InactiveScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { selectedDate } = useContext(DateContext);

  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);

  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [addTaskSectionId, setAddTaskSectionId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");

  /* Modal state */
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  async function loadData() {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;

    setLoading(true);
    try {
      /* 1) Haal alle secties op (zonder date-filter, want de secties zijn vast) */
      const secs = await fetchSections(kitchenId); // returns array of { id, section_name, ...}
      /* 2) Voor elke sectie, gebruik de helper om de taken (task_instances) voor de selectedDate op te halen */
      const merged: SectionData[] = await Promise.all(
        secs.map(async (sec: any) => {
          const tasks = await getTasksForSectionOnDate(sec.id, selectedDate);
          return {
            id: sec.id,
            section_name: sec.section_name,
            tasks: tasks,
          };
        })
      );
      setSections(merged);
    } catch (error) {
      console.log("Error loading inactive tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask() {
    /* Controleer of er een sectie is geselecteerd en dat er een taaknaam is ingevoerd */
    if (!addTaskSectionId || !newTaskName.trim()) return;

    try {
      /* 
       Hier moet je de geldige task_template_id verkrijgen.
       Mogelijke aanpak:
       1. Probeer eerst bestaande templates op te halen voor deze sectie en de geselecteerde datum:
      */
      const templates = await fetchTaskTemplatesBySection(addTaskSectionId, selectedDate);
      // const newTask = await createTaskInstance(addTaskSectionId, selectedDate);
      let templateId: string;

      if (templates.length > 0) {
        /* Als er al een template bestaat, neem dan bijvoorbeeld de eerste template */
        templateId = templates[0].id;
      } else {
        /* Als er geen template bestaat, maak dan een nieuwe template aan,
         Hier kun je bijvoorbeeld de ingevoerde newTaskName gebruiken als taskName */
        const newTemplate = await createTaskTemplate(
          addTaskSectionId, // Let op: dit is de sectie-id, wat juist is voor het maken van een template
          newTaskName, // De taaknaam
          selectedDate, // Je kunt hier eventueel de geldigheidsperiode instellen; als je deze taak maar één dag wilt
          selectedDate // In dit voorbeeld gebruiken we dezelfde datum voor start en eind.
        );
        templateId = newTemplate.id;
      }

      /* Nu dat we een geldige task_template_id hebben, maak een task instance aan voor de geselecteerde datum */
      const newTask = await createTaskInstance(templateId, selectedDate);

      /* (Optioneel) Als je de taaknaam niet automatisch hebt ingevuld in de instance, kun je die hier overschrijven: */
      newTask.task_name = newTaskName;

      /* Werk de lokale state bij: voeg de nieuwe taak instance toe aan de juiste sectie */
      const updatedSections = sections.map((sec) => {
        if (sec.id === addTaskSectionId) {
          return {
            ...sec,
            tasks: [...sec.tasks, newTask],
          };
        }
        return sec;
      });
      setSections(updatedSections);
    } catch (error) {
      console.log("Error creating task:", error);
    } finally {
      closeAddTaskModal();
    }
  }

  async function handleSetActiveTask() {
    if (!selectedTask) return;
    await updateTaskInstanceStatus(selectedTask.id, "active");
    // Update de lokale state:
    const updatedSections = sections.map((sec) => {
      if (sec.id !== selectedTask.section.id) return sec;
      return {
        ...sec,
        tasks: sec.tasks.map((t) => (t.id === selectedTask.id ? { ...t, status: "active" } : t)),
      };
    });
    setSections(updatedSections);
    closeTaskDetailsModal();
  }

  async function handleAssignTask(profileId: string) {
    if (!selectedTask) return;
    await assignTaskInstance(selectedTask.id, profileId);
    // Update de lokale state indien gewenst
  }

  /* Flow taak toevoegen */
  function openAddTaskModal(sectionId: string) {
    setAddTaskSectionId(sectionId);
    setNewTaskName("");
    setAddTaskModalVisible(true);
  }
  function closeAddTaskModal() {
    setAddTaskSectionId(null);
    setNewTaskName("");
    setAddTaskModalVisible(false);
  }

  /* Flow taak details */
  function openTaskDetailsModal(task: TaskRow) {
    setSelectedTask(task);
    setShowDetailsModal(true);
  }
  function closeTaskDetailsModal() {
    setSelectedTask(null);
    setShowDetailsModal(false);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading tasks for {selectedDate}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header: "Inactive" */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{"<"} Inactive</Text>
        </TouchableOpacity>
      </View>

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
                <Text style={{ color: task.status === "active" ? "#000" : "#666" }}>
                  {task.task_name} ({task.status})
                </Text>
              </TouchableOpacity>
            ))}

            {/* + Voeg taak toe */}
            <TouchableOpacity style={styles.addTaskButton} onPress={() => openAddTaskModal(sec.id)}>
              <Text style={styles.addTaskText}>+ Voeg taak toe</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal voor “Taak toevoegen” */}
      <Modal
        visible={addTaskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAddTaskModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nieuwe taak</Text>
            <TextInput
              style={styles.input}
              value={newTaskName}
              onChangeText={setNewTaskName}
              placeholder="Naam van de taak"
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleCreateTask}>
              <Text style={{ color: "#fff" }}>Opslaan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={closeAddTaskModal}>
              <Text>Annuleren</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal voor “Taak details” (status, assign, etc.) */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={closeTaskDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTask && (
              <>
                <Text style={styles.modalTitle}>{selectedTask.task_name}</Text>
                <Text>Status: {selectedTask.status}</Text>

                {/* Assign to user */}
                <View style={styles.assignRow}>
                  <Text>Assign to:</Text>
                  <View style={styles.profilesRow}>
                    {["JK", "S", "RS", "IJ", "KL"].map((prof) => (
                      <TouchableOpacity
                        key={prof}
                        style={styles.profileBubble}
                        onPress={() => handleAssignTask(prof)}
                      >
                        <Text>{prof}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Status wijzigen */}
                <View style={styles.statusRow}>
                  <Text>Status:</Text>
                  <TouchableOpacity onPress={handleSetActiveTask} style={{ marginTop: 10 }}>
                    <Text>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statusButton} onPress={() => console.log("Out of stock")}>
                    <Text>Out of stock</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => console.log("Inactive")} style={{ marginTop: 10 }}>
                    <Text>Inactive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statusButton} onPress={() => console.log("Edit")}>
                    <Text>Edit</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={closeTaskDetailsModal} style={styles.closeButton}>
                  <Text>Close</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backText: { color: "#666", fontSize: 16 },
  sectionContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  taskItem: {
    backgroundColor: "#eee",
    marginBottom: 6,
    padding: 10,
    borderRadius: 6,
  },
  taskName: { fontSize: 16 },
  addTaskButton: {
    marginTop: 6,
    paddingVertical: 8,
  },
  addTaskText: {
    color: "#666",
  },
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
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
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
  cancelButton: {
    padding: 10,
    alignItems: "center",
  },
  assignRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  profilesRow: { flexDirection: "row", marginLeft: 8 },
  profileBubble: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statusButton: {
    backgroundColor: "#ddd",
    borderRadius: 6,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginTop: 10,
  },
});
