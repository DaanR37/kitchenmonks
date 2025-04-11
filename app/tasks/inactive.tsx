import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
  Pressable,
} from "react-native";
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
import { createTaskTemplate } from "@/services/api/taskTemplates";
import { fetchProfiles } from "@/services/api/profiles";
import Ionicons from "@expo/vector-icons/build/Ionicons";

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
    start_date?: string;
    end_date?: string;
  };
};

/* 
  Type definitie voor een sectie 
  - Elke sectie bevat een naam en een lijst van taakinstances (TaskRow)
*/
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
      /* 1) Haal alle secties op voor de keuken */
      const secs = await fetchSections(kitchenId);
      /* 2) Voor elke sectie: haal de taken voor de geselecteerde datum op en voeg de section-gegevens (inclusief datums) toe */
      const merged: SectionData[] = await Promise.all(
        secs.map(async (sec: any) => {
          /* Haal de taken op voor deze sectie voor de geselecteerde datum. */
          const tasks = await getTasksForSectionOnDate(sec.id, selectedDate);

          /* Voor elke taak voegen we handmatig de sectiegegevens toe, zodat later de modal hierop kan vertrouwen */
          const tasksWithSection = tasks.map((t: any) => ({
            ...t,
            section: {
              id: sec.id,
              section_name: sec.section_name,
              start_date: sec.start_date,
              end_date: sec.end_date,
            },
          }));

          /* Geef de sectie terug met alle relevante informatie, inclusief start en eind datum */
          return {
            id: sec.id,
            section_name: sec.section_name,
            start_date: sec.start_date, //Parent start datum
            end_date: sec.end_date, //Parent eind datum
            tasks: tasksWithSection,
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
      /* Zoek de oudersectie op in de lokale state, zodat we de start- en einddatum ervan hebben */
      const sectionObj = sections.find((sec) => sec.id === addTaskSectionId);
      if (!sectionObj) {
        console.log("Geen section data gevonden voor addTaskSectionId:", addTaskSectionId);
        return;
      }

      /* Maak altijd een nieuwe task template aan. We voegen een timestamp toe voor uniciteit,
      maar nu gebruiken we de start_date en end_date van de sectie als de geldigheidsperiode */
      const newTemplate = await createTaskTemplate(
        addTaskSectionId,
        newTaskName + " " + new Date().getTime(),
        sectionObj.start_date, // Gebruik de parent start datum
        sectionObj.end_date // Gebruik de parent eind datum
      );

      const templateId = newTemplate.id; /* Verkrijg de nieuwe task_template_id */

      /*  Maak een nieuwe task instance aan voor de geselecteerde datum.
      De task instance krijgt zijn datum (bijv. "Today" of de geselecteerde dag) */
      const newTask = await createTaskInstance(templateId, selectedDate);
      newTask.task_name = newTaskName;
      newTask.assigned_to = []; /* Begin met een lege array */

      /* Voeg de sectiegegevens toe aan de nieuwe taak, zodat we bijvoorbeeld later in de modal de parent-informatie kunnen tonen */
      newTask.section = { id: sectionObj.id, section_name: sectionObj.section_name };

      // const sectionObj = sections.find((sec) => sec.id === addTaskSectionId);
      // if (sectionObj) {
      //   /* Voeg alle relevante sectiegegevens toe */
      //   newTask.section = { id: sectionObj.id, section_name: sectionObj.section_name };
      // } else {
      //   /* Als er geen section in de lokale state gevonden wordt, log dit voor debugging */
      //   console.log("Warning: Geen section data gevonden voor addTaskSectionId:", addTaskSectionId);
      // }

      /* Update de lokale state door de nieuwe taak toe te voegen aan de taken van de juiste sectie */
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

  /* ---- Hier komt een functie om de taak inactive te maken ---- */
  async function handleSetInactiveTask() {
    if (!selectedTask) return;
    try {
      // toewijzingen ongedaan maken
      await updateTaskInstanceStatus(selectedTask.id, "inactive");
      await assignTaskInstance(selectedTask.id, []);
      // ... update local state ...
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
    } catch (error) {
      console.log("Error setting inactive:", error);
    }
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
  function getColorFromId(id: string): string {
    const colorPalette = ["#3300ff", "#ff6200", "#00931d", "#d02350", "#6C63FF", "#FC3D21"];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
  }

  /* horizontale slider styling */
  const renderProfileBubbles = () => {
    if (!selectedTask) return null;
    return (
      <FlatList
        horizontal
        data={allProfiles}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.profileBubblesContainer}
        renderItem={({ item: profile }) => {
          const initials = (profile.first_name.charAt(0) + profile.last_name.charAt(0)).toUpperCase();
          const isAssigned = selectedTask?.assigned_to?.includes(profile.id);
          return (
            <TouchableOpacity
              style={[
                styles.profileBubble,
                { backgroundColor: getColorFromId(profile.id) },
                isAssigned && styles.profileBubbleSelected,
              ]}
              onPress={() => handleToggleAssignTask(profile.id)}
              key={profile.id}
            >
              <Text style={styles.profileBubbleText}>{initials}</Text>
            </TouchableOpacity>
          );
        }}
      />
      // <ScrollView
      //   horizontal
      //   showsHorizontalScrollIndicator={false}
      //   contentContainerStyle={styles.profileBubblesContainer}
      // >
      //   {allProfiles.map((profile) => {
      //     const isAssigned = selectedTask.assigned_to?.includes(profile.id);
      //     const bgColor = getColorFromId(profile.id); // Bepaal de kleur
      //     // Bepaal initialen, mocht je dat doen via generateInitials()
      //     const initials = (profile.first_name?.charAt(0) ?? "") + (profile.last_name?.charAt(0) ?? "");
      //     return (
      //       <TouchableOpacity
      //         key={profile.id}
      //         style={[
      //           styles.profileBubble,
      //           { backgroundColor: bgColor }, // Basiskleur
      //           isAssigned && styles.profileBubbleSelected,
      //         ]}
      //         onPress={() => handleToggleAssignTask(profile.id)}
      //       >
      //         <Text style={styles.profileBubbleText}>{initials.toUpperCase()}</Text>
      //       </TouchableOpacity>
      //     );
      //   })}
      // </ScrollView>
    );
  };

  /* De rest van de modal: */
  const renderTaskModal = () => {
    if (!selectedTask) return null;
    return (
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={closeTaskDetailsModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeTaskDetailsModal}>
          <Pressable style={styles.bottomModalContainer} onPress={(e) => e.stopPropagation()}>
            {/* Taaknaam */}
            <Text style={styles.modalTaskTitle}>{cleanTaskName(selectedTask.task_name)}</Text>
            {/* “Assign to” label */}
            {/* Wellicht zonder assignContainer !!!!! */}
            {/* <View style={styles.assignContainer}> */}
              <Text style={styles.assignTitle}>Assign to:</Text>
            {/* </View> */}
            {/* Horizontale slider met profielen */}
            {renderProfileBubbles()}



            {/* Status-keuzes in 2x2 layout, etc. */}
            <View style={styles.statusGridContainer}>
              <Text style={styles.statusGridTitle}>Status</Text>
              {/* Rij 1: Active / Inactive */}
              <View style={styles.statusGridRow}>
                <TouchableOpacity
                  style={[styles.statusOval, selectedTask.status === "active" && styles.statusOvalSelected]}
                  onPress={handleSetActiveTask}
                >
                  {/* Cirkeltje links, evt. met icon */}
                  <View
                    style={[
                      styles.statusOvalCircle,
                      { backgroundColor: "#00AA00" }, // groen voor active
                      selectedTask.status !== "active" && { opacity: 0.5 },
                    ]}
                  >
                    {/* Eventueel een icoon */}
                    {/* <Ionicons name="checkmark" size={14} color="#fff" /> */}
                  </View>

                  {/* Tekst in de ovale knop */}
                  <Text
                    style={[
                      styles.statusOvalLabel,
                      selectedTask?.status === "active" && { color: "#fff" },
                      // selectedTask?.status === "inactive" && styles.statusOvalLabelSelected,
                    ]}
                  >
                    Active
                  </Text>
                  {/* <Text
                    style={[
                      styles.statusBoxText,
                      selectedTask.status === "active" && styles.statusBoxTextSelected,
                    ]}
                  >
                    Active
                  </Text> */}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusOval, selectedTask.status === "inactive" && styles.statusOvalSelected]}
                  onPress={() => handleSetInactiveTask()}
                >
                  <View
                    style={[
                      styles.statusOvalCircle,
                      { backgroundColor: "#999" },
                      selectedTask.status !== "inactive" && { opacity: 0.5 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusOvalLabel,
                      selectedTask?.status === "inactive" && { color: "#fff" },
                      // selectedTask?.status === "inactive" && styles.statusOvalLabelSelected,
                    ]}
                  >
                    Inactive
                  </Text>
                  {/* <Text
                    style={[
                      styles.statusBoxText,
                      selectedTask.status === "inactive" && styles.statusBoxTextSelected,
                    ]}
                  >
                    Inactive
                  </Text> */}
                </TouchableOpacity>
              </View>

              {/* Rij 2: Out of Stock / Edit */}
              <View style={styles.statusGridRow}>
                <TouchableOpacity
                  style={[
                    styles.statusOval,
                    selectedTask.status === "out of stock" && styles.statusOvalSelected,
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
                  <View
                    style={[
                      styles.statusOvalCircle,
                      { backgroundColor: "#FF6347" }, // Tomaat-rood
                      selectedTask.status !== "out of stock" && { opacity: 0.5 },
                    ]}
                  >
                    {/* voorbeeld van icoontje */}
                    <Ionicons name="alert" size={14} color="#fff" />
                  </View>
                  <Text
                    style={[
                      styles.statusOvalLabel,
                      selectedTask?.status === "out of stock" && { color: "#fff" },
                      // selectedTask?.status === "out of stock" && styles.statusOvalLabelSelected,
                    ]}
                  >
                    Out of stock
                  </Text>
                  {/* <Text
                    style={[
                      styles.statusBoxText,
                      selectedTask.status === "out of stock" && styles.statusBoxTextSelected,
                    ]}
                  >
                    Out of stock
                  </Text> */}
                </TouchableOpacity>

                <TouchableOpacity style={styles.statusOval} onPress={() => console.log("Edit")}>
                  <View style={[styles.statusOvalCircle, { backgroundColor: "#555" }]}>
                    <Ionicons name="create" size={14} color="#fff" />
                  </View>
                  <Text style={styles.statusOvalLabel}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Close button onderaan - MODAL ZOU MOETEN SLUITEN WANNEER JE NAAST DE MODAL KLIKT -> GEEN CLOSE BUTTON NODIG */}
            {/* <TouchableOpacity onPress={closeTaskDetailsModal} style={styles.closeButton2}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity> */}
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

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
        <Pressable style={styles.modalOverlay} onPress={closeAddTaskModal}>
          {/* Stop propagatie zodat klikken binnen de modal de modal niet sluit */}
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
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
          </Pressable>
        </Pressable>
      </Modal>

      {/* --- Modal: Taakdetails --- */}
      {renderTaskModal()}
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
  modalContent: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 30,
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
  // assignContainer: {
  //   marginBottom: 16,
  // },
  assignTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  profileBubblesContainer: {
    flexDirection: "row",
    flexWrap: "wrap", // zodat de bubbles doorlopen op een nieuwe regel als ze niet passen
  },
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
  profileBubbleSelected: {
    backgroundColor: "#6C63FF",
    borderWidth: 3,
    // borderColor: "#4838e8",
    borderColor: "black",
  },
  profileBubbleText: {
    color: "#fff",
    fontWeight: "bold",
  },

  // 2x2 knoppen layout voor de status
  statusGridContainer: {
    marginBottom: 24,
  },
  statusGridTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginTop: 12,
  },
  statusGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  /* De ovale container */
  statusOval: {
    flex: 1, // zodat ze even breed worden
    flexDirection: "row", // horizontaal: cirkel links + label rechts
    alignItems: "center",
    marginHorizontal: 4, // kleine marge
    // paddingVertical: 12,
    // paddingHorizontal: 16,
    borderRadius: 50, // Hoog radius voor ovale vorm
    // backgroundColor: "#eee", // Basiskleur
    backgroundColor: "#f2f2f2",
  },
  // Als de status “geselecteerd” is, kun je wat highlight geven
  statusOvalSelected: {
    backgroundColor: "#6C63FF",
  },
  statusOvalCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 8,
    marginLeft: 4,
    marginTop: 4,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  statusOvalLabel: {
    color: "#333",
    fontSize: 15,
    fontWeight: "500",
  },

  // Sluitknop helemaal onderaan
  // closeButton2: {
  //   marginTop: 16,
  //   alignSelf: "center",
  //   paddingVertical: 8,
  //   paddingHorizontal: 24,
  //   backgroundColor: "#eee",
  //   borderRadius: 8,
  // },
  // closeButtonText: {
  //   color: "#333",
  //   fontSize: 16,
  // },
});
