import React, { useState, useEffect, useContext } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { fetchSections } from "@/services/api/sections";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers"; /* Haal de dag-specifieke taken voor een sectie op, door de logica in taskHelpers te gebruiken */
import {
  updateTaskInstanceStatus,
  assignTaskInstance,
  createTaskInstance,
} from "@/services/api/taskInstances";
import { createTaskTemplate, fetchTaskTemplatesBySection } from "@/services/api/taskTemplates";
import { fetchProfiles } from "@/services/api/profiles";

/* 
  Type definitie voor een task (taakinstance) 
  - task_template_id: de referentie naar de task template (moet een geldige waarde zijn in task_templates)
  - section: de gekoppelde sectie (via de foreign key)
*/
export type TaskRow = {
  id: string;
  task_name: string;
  status: string;
  date: string;
  /* Voor toewijzing gebruiken we een array met profile IDs */
  assigned_to?: string[];
  task_template_id: string;
  section_id: string;
  section: {
    id: string;
    section_name: string;
  };
};

/* 
  Type definitie voor een sectie 
  - Elke sectie bevat een naam en een lijst van taakinstances (TaskRow)
*/
export type SectionData = {
  id: string;
  section_name: string;
  tasks: TaskRow[];
};

export type ProfileData = {
  id: string;
  first_name: string;
  last_name: string;
  // Eventueel extra velden zoals thumbnail_color etc.
  // profile_name: string;
  // kitchen_id: string;
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

  /* Laad de secties en per sectie de taakinstances voor de geselecteerde datum */
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  /// ------------------------------- ///
  /// --- Handlers voor de data --- ///
  /// ------------------------------- ///

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
      /* 1) Haal alle secties op voor de keuken (zonder datumfilter, want de secties zijn de vaste menukaart) */
      const secs = await fetchSections(kitchenId);

      /* 2) Voor elke sectie, haal de taken op via getTasksForSectionOnDate
      En voeg de section info toe aan elke taak zodat later selectedTask.section beschikbaar is */
      const merged: SectionData[] = await Promise.all(
        secs.map(async (sec: any) => {
          const tasks = await getTasksForSectionOnDate(sec.id, selectedDate);

          /* Map over de taken en voeg de section-data toe */
          const tasksWithSection = tasks.map((t: any) => ({
            ...t,
            section: { id: sec.id, section_name: sec.section_name },
          }));

          return {
            id: sec.id,
            section_name: sec.section_name,
            tasks: tasksWithSection,
          };
        })
      );

      /* Sla de gecombineerde data (secties met hun taken) op in de lokale state */
      setSections(merged);
    } catch (error) {
      console.log("Error loading inactive tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  /*
    handleCreateTask:
    - Wordt aangeroepen wanneer de gebruiker in de "Nieuwe taak" modal op Opslaan drukt.
    - Controleert eerst of er een sectie geselecteerd is en dat er een taaknaam is ingevoerd.
    - Vervolgens:
      1. Probeert bestaande task_templates op te halen voor de geselecteerde sectie en datum.
      2. Als er al templates bestaan, gebruikt hij er één (bijv. de eerste).
      3. Als er geen template bestaat, maakt hij er een aan met createTaskTemplate.
      4. Daarna wordt met het verkregen templateId een nieuwe task instance aangemaakt via createTaskInstance.
      5. De nieuwe taakinstance wordt toegevoegd aan de lokale state zodat de UI wordt bijgewerkt.
  */
  async function handleCreateTask() {
    /* Controleer of er een sectie is geselecteerd en dat er een taaknaam is ingevoerd */
    if (!addTaskSectionId || !newTaskName.trim()) return;
    try {
      /* Maak altijd een nieuwe task template aan, zodat elke taak uniek is.
      We voegen een timestamp toe zodat de taaknaam uniek wordt */
      const newTemplate = await createTaskTemplate(
        addTaskSectionId,
        newTaskName + " " + new Date().getTime(),
        selectedDate,
        selectedDate
      );
      const templateId = newTemplate.id; /* Verkrijg de nieuwe task_template_id */

      /* Maak een nieuwe task instance aan voor de geselecteerde datum */
      const newTask = await createTaskInstance(templateId, selectedDate);
      newTask.task_name = newTaskName;
      newTask.assigned_to = []; /* Begin met een lege array */

      /* Voeg de section data toe aan newTask zodat deze later gebruikt kan worden in de modal
      Haal uit de local state de sectie die overeenkomt met addTaskSectionId */
      const sectionObj = sections.find((sec) => sec.id === addTaskSectionId);
      if (sectionObj) {
        /* Voeg alle relevante sectiegegevens toe */
        newTask.section = { id: sectionObj.id, section_name: sectionObj.section_name };
      } else {
        /* Als er geen section in de lokale state gevonden wordt, log dit voor debugging */
        console.log("Warning: Geen section data gevonden voor addTaskSectionId:", addTaskSectionId);
      }

      /* Werk de lokale state bij: voeg de nieuwe taak toe aan de juiste sectie */
      const updatedSections = sections.map((sec) => {
        if (sec.id === addTaskSectionId) {
          return { ...sec, tasks: [...sec.tasks, newTask] };
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

  /*
    handleSetActiveTask:
    - Wijzigt de status van de geselecteerde taak instance naar "active".
    - Update de lokale state zodat de UI direct de nieuwe status weergeeft.
  */
  async function handleSetActiveTask() {
    if (!selectedTask) return;
    await updateTaskInstanceStatus(selectedTask.id, "active");
    /* Update de lokale state: wijzig de status in de juiste sectie */
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

  /* handleToggleAssignTask:
    Hiermee kun je een taak toewijzen aan (of loskoppelen van) een profiel.
    - Als het profiel al is toegewezen, verwijderen we het.
    - Anders voegen we het profiel toe.
    We werken met een array voor "assigned_to", maar in de database slaan we het tijdelijk als een komma-gescheiden string op. */
  async function handleToggleAssignTask(profileId: string) {
    if (!selectedTask) return;
    if (!selectedTask.section) {
      console.log("Selected task mist section data.");
      return;
    }

    /* Kopieer de huidige toewijzingen (als array). Als er niets is, start met een lege array */
    let currentAssignments: string[] = selectedTask.assigned_to ? [...selectedTask.assigned_to] : [];

    /* Controleer of het profiel al is toegewezen */
    const isAssigned = currentAssignments.includes(profileId);

    /* Als het profiel al is toegewezen, verwijder het; anders voeg het toe */
    if (isAssigned) {
      currentAssignments = currentAssignments.filter((id) => id !== profileId);
    } else {
      currentAssignments.push(profileId);
    }

    /* Bepaal nieuwe status: als er een of meer profielen toegewezen zijn, dan 'active', anders 'inactive' */
    const newStatus = currentAssignments.length > 0 ? "active" : "inactive";

    try {
      /* Update in de database: werk zowel de toewijzing als de status bij */
      await assignTaskInstance(selectedTask.id, currentAssignments);
      await updateTaskInstanceStatus(selectedTask.id, newStatus);

      /* Update lokale state van de secties: zoek de sectie en update daar de taak */
      const updatedSections = sections.map((sec) => {
        /* Controleer of de sectie van de taak bekend is - extra check */
        if (!selectedTask || !selectedTask.section) return sec;

        /* Als de sectie-id niet overeenkomt, laat die sectie ongewijzigd */
        if (sec.id !== selectedTask.section.id) return sec;

        /* Indien wel, update dan de betreffende taak */
        return {
          ...sec,
          tasks: sec.tasks.map((t) =>
            t.id === selectedTask.id ? { ...t, assigned_to: currentAssignments, status: newStatus } : t
          ),
        };
      });
      setSections(updatedSections);

      /* Belangrijk: Update ook de lokale state van selectedTask, zodat deze de nieuwe toewijzingen en status bevat */
      setSelectedTask({ ...selectedTask, assigned_to: currentAssignments, status: newStatus });
    } catch (error) {
      console.log("Error updating assignment/status:", error);
    }
  }

  /// ------------------------------- ///
  /// --- Handlers voor de modals --- ///
  /// ------------------------------- ///

  /* Handlers voor de "Nieuwe taak" modal */
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

  /* Handlers voor de taak details modal */
  function openTaskDetailsModal(task: TaskRow) {
    setSelectedTask(task);
    setShowDetailsModal(true);
  }
  function closeTaskDetailsModal() {
    setSelectedTask(null);
    setShowDetailsModal(false);
  }

  function cleanTaskName(fullName: string): string {
    /* Splits de naam op spaties */
    const parts = fullName.split(" ");
    /* Controleer of het laatste onderdeel enkel cijfers bevat en minstens 10 tekens lang is (een indicatie van een timestamp) */
    const lastPart = parts[parts.length - 1];
    if (/^\d{10,}$/.test(lastPart)) {
      // Verwijder het laatste element en voeg de rest weer samen
      parts.pop();
      return parts.join(" ");
    }
    return fullName;
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
      {/* Header met een back-button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{"<"} Inactive</Text>
        </TouchableOpacity>
      </View>

      {/* Lijst met secties en hun taken */}
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
                  {/* {task.task_name} ({task.status}) */}
                  {cleanTaskName(task.task_name)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Button om een nieuwe taak toe te voegen aan de sectie */}
            <TouchableOpacity style={styles.addTaskButton} onPress={() => openAddTaskModal(sec.id)}>
              <Text style={styles.addTaskText}>+ Voeg taak toe</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal voor het toevoegen van een nieuwe taak */}
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

      {/* Modal voor taakdetails: status wijzigen of taak toewijzen */}
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
                {/* Taaknaam en huidige status tonen */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{cleanTaskName(selectedTask.task_name)}</Text>
                </View>

                {/* <Text>Status: {selectedTask.status}</Text> */}

                {/* Assign to user: Laat een rij met profielen zien */}
                <View style={styles.assignRow}>
                  <Text style={{ marginRight: 8 }}>Assign to:</Text>
                  <View style={styles.profilesRow}>
                    {allProfiles.map((profile) => {
                      const initials =
                        profile.first_name.charAt(0).toUpperCase() +
                        profile.last_name.charAt(0).toUpperCase();
                      // Controleer of dit profiel al is toegewezen aan de taak
                      const isAssigned = selectedTask.assigned_to?.includes(profile.id);
                      return (
                        <TouchableOpacity
                          key={profile.id}
                          style={[
                            styles.profileBubble,
                            isAssigned && { borderWidth: 2, borderColor: "#6C63FF" },
                          ]}
                          onPress={() => handleToggleAssignTask(profile.id)}
                        >
                          <Text style={{ color: "#fff" }}>{initials}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Status aanpassen: Active, Inactive, Out of stock, Edit */}
                <View style={styles.statusRow}>
                  <Text style={{ marginRight: 8 }}>Status:</Text>

                  {/* Active Button */}
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      selectedTask.status === "active" && { backgroundColor: "#6C63FF" },
                    ]}
                    onPress={handleSetActiveTask}
                  >
                    <Text style={{ color: "#fff" }}>Active</Text>
                  </TouchableOpacity>

                  {/* Inactive Button */}
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      selectedTask.status === "inactive" && { backgroundColor: "#aaa" },
                    ]}
                    onPress={async () => {
                      /* Zet taak op inactive en maak alle toewijzingen ongedaan */
                      await updateTaskInstanceStatus(selectedTask.id, "inactive");
                      await assignTaskInstance(selectedTask.id, []);
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
                    <Text style={{ color: "#fff" }}>Inactive</Text>
                  </TouchableOpacity>

                  {/* Out of stock Button */}
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      selectedTask.status === "out of stock" && { backgroundColor: "#FF6347" },
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
                    <Text style={{ color: "#fff" }}>Out of stock</Text>
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },
  backText: { color: "#666", fontSize: 16 },
  sectionContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  taskItem: { backgroundColor: "#eee", marginBottom: 6, padding: 10, borderRadius: 6 },
  taskName: { fontSize: 16 },
  addTaskButton: { marginTop: 6, paddingVertical: 8 },
  addTaskText: { color: "#666" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingTop: 30, }, 

  modalHeader: {
    position: "absolute",
    top: 8,
    right: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 24, color: "#333" },


  input: { backgroundColor: "#f2f2f2", padding: 8, borderRadius: 6, marginBottom: 12 },
  saveButton: {
    backgroundColor: "#6C63FF",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  cancelButton: { padding: 10, alignItems: "center" },
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
  closeButton: { alignSelf: "flex-end", marginTop: 10 },
});
