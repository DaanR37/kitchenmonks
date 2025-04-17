import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { ProfileData } from "@/services/ProfileContext";
import { fetchSections } from "@/services/api/sections";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers"; /* Haal de dag-specifieke taken voor een sectie op, door de logica in taskHelpers te gebruiken */
import {
  updateTaskInstanceStatus,
  assignTaskInstance,
  createTaskInstance,
  updateTaskInstanceInProgress,
  updateTaskInstanceDone,
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

export type StatusMeta = {
  backgroundColor: string;
  borderColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

const STATUS_META: Record<string, StatusMeta> = {
  done: { backgroundColor: "#00AA00", icon: "checkmark", iconColor: "#fff" },
  "in progress": { backgroundColor: "#0066ff", icon: "refresh", iconColor: "#fff" },
  active: { backgroundColor: "transparent", borderColor: "#999" /* geen icon */ },
  inactive: { backgroundColor: "transparent", borderColor: "#ccc" /* geen icon */ },
  "out of stock": { backgroundColor: "#ff6347", icon: "alert", iconColor: "#fff" },
  edit: { backgroundColor: "#000", icon: "create" },
};

export default function TeamMepScreen() {
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
          const allTasks = await getTasksForSectionOnDate(sec.id, selectedDate);

          /* Voor elke taak voegen we handmatig de sectiegegevens toe, zodat later de modal hierop kan vertrouwen */
          // const tasksWithSection = tasks.map((t: any) => ({
          //   ...t,
          //   section: {
          //     id: sec.id,
          //     section_name: sec.section_name,
          //     start_date: sec.start_date,
          //     end_date: sec.end_date,
          //   },
          // }));

          /* Geef de sectie terug met alle relevante informatie, inclusief start en eind datum */
          // return {
          //   id: sec.id,
          //   section_name: sec.section_name,
          //   start_date: sec.start_date, //Parent start datum
          //   end_date: sec.end_date, //Parent eind datum
          //   tasks: tasksWithSection,
          // };

          const tasks = allTasks
            .filter((t) => t.status === "active" || t.status === "in progress" || t.status === "done")
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

  /* 3) Handlers voor in‑progress / done / assign / etc. (zelfde als voor MyTasks) */
  async function handleToggleAssignTask(profileId: string) {
    if (!selectedTask) return;
    const current = selectedTask.assigned_to ?? [];
    const next = current.includes(profileId)
      ? current.filter((id) => id !== profileId)
      : [...current, profileId];
    const newStatus = next.length > 0 ? "active" : "inactive";

    try {
      await assignTaskInstance(selectedTask.id, next);
      await updateTaskInstanceStatus(selectedTask.id, newStatus);
      refreshSingleStatus(newStatus, next);
    } catch (e) {
      console.error(e);
    }
  }
  async function handleSetDone() {
    if (!selectedTask) return;
    try {
      await updateTaskInstanceDone(selectedTask.id);
      refreshSingleStatus("done");
    } catch (e) {
      console.error(e);
    }
  }
  async function handleSetInProgress() {
    if (!selectedTask) return;
    try {
      await updateTaskInstanceInProgress(selectedTask.id);
      refreshSingleStatus("in progress");
    } catch (e) {
      console.error(e);
    }
  }
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
  async function handleSetOutOfStock() {
    if (!selectedTask) return;
    try {
      await updateTaskInstanceStatus(selectedTask.id, "out of stock");
      refreshSingleStatus("out of stock");
    } catch (error) {
      console.log("Error setting out of stock:", error);
    }
  }

  /* helper om één taak in state bij te werken */
  function refreshSingleStatus(status: string, assigned_to: string[] = selectedTask?.assigned_to ?? []) {
    if (!selectedTask) return;
    const updated = { ...selectedTask, status, assigned_to };
    setSelectedTask(updated);

    setSections((secs) =>
      secs.map((sec) =>
        sec.id !== updated.section.id
          ? sec
          : {
              ...sec,
              tasks: sec.tasks.map((t) => (t.id === updated.id ? updated : t)),
            }
      )
    );
  }

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

  function generateInitials(firstName?: string, lastName?: string): string {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}`;
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

  /* Handle the circle press */
  const handleCirclePress = async (task: TaskRow) => {
    // 1) Update DB
    await updateTaskInstanceDone(task.id);
    // 2) Lokale state bijwerken
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== task.section.id) return sec;
        return {
          ...sec,
          tasks: sec.tasks.map((t) => (t.id === task.id ? { ...t, status: "done" } : t)),
        };
      })
    );

    // 3) Modal openen
    setSelectedTask({ ...task, status: "done" });
    setShowDetailsModal(true);
  };

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
    );
  };

  /* De rest van de modal: */
  const renderTeamMepModal = () => {
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
            <Text style={styles.assignTitle}>Assign to:</Text>

            {/* Horizontale slider met profielen */}
            {renderProfileBubbles()}

            {/* Status-keuzes in 3x3 layout, etc. */}
            <View style={styles.statusGridContainer}>
              <Text style={styles.statusGridTitle}>Status</Text>

              {/* Rij 1: Done / In progress */}
              <View style={styles.statusGridRow}>
                {/* Done */}
                <TouchableOpacity
                  style={[styles.statusOval, selectedTask.status === "done" && styles.statusOvalSelected]}
                  onPress={handleSetDone}
                >
                  {/* Cirkeltje links, evt. met icon */}
                  <View
                    style={[
                      styles.statusOvalCircle,
                      { backgroundColor: "#00AA00" }, // groen voor active
                      selectedTask.status !== "done" && { opacity: 0.5 },
                    ]}
                  >
                    {/* Eventueel een icoon */}
                    {/* <Ionicons name="checkmark" size={14} color="#fff" /> */}
                  </View>

                  {/* Tekst in de ovale knop */}
                  <Text
                    style={[
                      styles.statusOvalLabel,
                      selectedTask.status === "done" && { color: "#000", fontWeight: "bold" },
                      // selectedTask?.status === "inactive" && styles.statusOvalLabelSelected,
                    ]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>

                {/* In progress */}
                <TouchableOpacity
                  style={[
                    styles.statusOval,
                    selectedTask.status === "in progress" && styles.statusOvalSelected,
                  ]}
                  onPress={() => handleSetInProgress()}
                >
                  <View
                    style={[
                      styles.statusOvalCircle,
                      { backgroundColor: "#999" },
                      selectedTask.status !== "in progress" && { opacity: 0.5 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusOvalLabel,
                      selectedTask.status === "in progress" && { color: "#000", fontWeight: "bold" },
                      // selectedTask?.status === "inactive" && styles.statusOvalLabelSelected,
                    ]}
                  >
                    In progress
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Rij 2: Active / Out of Stock */}
              <View style={styles.statusGridRow}>
                {/* Active */}
                <TouchableOpacity
                  style={[styles.statusOval, selectedTask.status === "active" && styles.statusOvalSelected]}
                  onPress={handleSetActiveTask}
                >
                  <View
                    style={[
                      styles.statusOvalCircle,
                      { backgroundColor: "#FF6347" }, // Tomaat-rood
                      selectedTask.status !== "active" && { opacity: 0.5 },
                    ]}
                  >
                    {/* voorbeeld van icoontje */}
                    <Ionicons name="alert" size={14} color="#fff" />
                  </View>
                  <Text
                    style={[
                      styles.statusOvalLabel,
                      selectedTask.status === "active" && { color: "#000", fontWeight: "bold" },
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>

                {/* Out of Stock */}
                <TouchableOpacity
                  style={[
                    styles.statusOval,
                    selectedTask.status === "out of stock" && styles.statusOvalSelected,
                  ]}
                  onPress={handleSetOutOfStock}
                >
                  <View style={[styles.statusOvalCircle, { backgroundColor: "#555" }]}>
                    <Ionicons name="create" size={14} color="#fff" />
                  </View>
                  <Text
                    style={[
                      styles.statusOvalLabel,
                      selectedTask.status === "out of stock" && { color: "#000", fontWeight: "bold" },
                    ]}
                  >
                    Out of Stock
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Rij 3: Inactive / Edit */}
              <View style={styles.statusGridRow}>
                {/* Inactive */}
                <TouchableOpacity
                  style={[styles.statusOval, selectedTask.status === "inactive" && styles.statusOvalSelected]}
                  onPress={handleSetInactiveTask}
                >
                  <View
                    style={[
                      styles.statusOvalCircle,
                      { backgroundColor: "#999" }, // Tomaat-rood
                      selectedTask.status !== "inactive" && { opacity: 0.5 },
                    ]}
                  >
                    {/* voorbeeld van icoontje */}
                    <Ionicons name="alert" size={14} color="#fff" />
                  </View>
                  <Text
                    style={[
                      styles.statusOvalLabel,
                      selectedTask.status === "inactive" && { color: "#000", fontWeight: "bold" },
                    ]}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>

                {/* Edit */}
                <TouchableOpacity style={styles.statusOval} onPress={() => console.log("Edit")}>
                  <View style={[styles.statusOvalCircle, { backgroundColor: "#555" }]}>
                    <Ionicons name="create" size={14} color="#fff" />
                  </View>
                  <Text style={styles.statusOvalLabel}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
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

            {sec.tasks.map((task) => {
              const meta = STATUS_META[task.status] || {
                backgroundColor: "transparent",
                borderColor: "#ccc",
              };

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
                  <Pressable style={styles.taskTextContainer} onPress={() => openTaskDetailsModal(task)}>
                    <Text
                      style={[
                        styles.taskText,
                        task.status === "done" ? styles.doneText : styles.inactiveText,
                      ]}
                    >
                      {cleanTaskName(task.task_name)}
                    </Text>
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
                          <Text style={styles.bubbleSmallText}>{initials}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
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
              <Text style={styles.saveButtonText}>Opslaan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={closeAddTaskModal}>
              <Text style={styles.cancelButtonText}>Annuleren</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* --- Modal: Taakdetails --- */}
      {renderTeamMepModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6", paddingTop: 25 },
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
  // taskItem: { backgroundColor: "#eee", marginBottom: 6, padding: 10, borderRadius: 6 },
  addTaskButton: { marginTop: 16, paddingVertical: 0 },
  addTaskText: { color: "#666" },

  // -- Modals styling --
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },

  // De 'onderste' container waarin de inhoud van de modal komt (zoals in je voorbeeld)
  bottomModalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 0,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 30,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, color: "#333" },
  modalTaskTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },

  input: { backgroundColor: "#f2f2f2", padding: 8, borderRadius: 6, marginBottom: 12 },
  saveButton: {
    backgroundColor: "#6C63FF",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  saveButtonText: { color: "#fff", fontWeight: "bold" },
  cancelButton: { padding: 10, alignItems: "center" },
  cancelButtonText: { color: "#333", fontWeight: "bold" },

  // -- Assign to styling --
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
    borderColor: "black",
  },
  profileBubbleText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 6,
    padding: 10,
    borderRadius: 6,
    // backgroundColor: "#eee",
    // marginBottom: 8,
    // paddingVertical: 12,
    // paddingHorizontal: 16,
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

  // 3x3 knoppen layout voor de status
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
    gap: 6,
  },
  /* De ovale container */
  statusOval: {
    flex: 1, // zodat ze even breed worden
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 0,
    borderRadius: 50,
    backgroundColor: "#f2f2f2",
  },
  // Als de status “geselecteerd” is, kun je wat highlight geven
  statusOvalSelected: {
    backgroundColor: "#9fdc8ab5",
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
});
