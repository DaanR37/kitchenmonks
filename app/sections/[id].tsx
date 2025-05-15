import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useContext } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { ProfileData } from "@/services/ProfileContext";
import {
  fetchSectionById,
  updateSectionName,
  deleteSectionWithCheck,
  fetchSections,
} from "@/services/api/sections";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers";
import {
  updateTaskInstanceInProgress,
  updateTaskInstanceDone,
  updateTaskInstanceStatus,
  assignTaskInstance,
  createTaskInstance,
} from "@/services/api/taskInstances";
import { createTaskTemplate } from "@/services/api/taskTemplates";
import { fetchProfiles } from "@/services/api/profiles";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import AppText from "@/components/AppText";
import useTaskModal, { TaskRow, SectionData } from "@/hooks/useTaskModal";
import { STATUS_META } from "@/constants/statusMeta";
import { cleanTaskName, generateInitials, getColorFromId } from "@/utils/taskUtils";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function SingleSectionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useContext(AuthContext);
  const { selectedDate } = useContext(DateContext);

  const [sections, setSections] = useState<SectionData[]>([]);
  const [sectionName, setSectionName] = useState("");
  const [editing, setEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [addTaskSectionId, setAddTaskSectionId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
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
    if (typeof id === "string") {
      loadData(id);
    }
  }, [id]);

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

  async function loadData(sectionId: string) {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId) return;

    setLoading(true);
    try {
      // Haal alle secties op voor deze keuken
      const allSections = await fetchSections(kitchenId, selectedDate);

      // Zoek de juiste sectie op basis van sectionId
      const selectedSection = allSections.find((sec: any) => sec.id === sectionId);
      if (!selectedSection) {
        console.warn("Section niet gevonden met ID:", sectionId);
        return;
      }

      // Haal de taken op voor de geselecteerde datum
      const allTasks = await getTasksForSectionOnDate(sectionId, selectedDate);

      // Voeg sectiegegevens toe aan elke taak
      const tasksWithSection = allTasks.map((t: any) => ({
        ...t,
        section: {
          id: selectedSection.id,
          section_name: selectedSection.section_name,
          start_date: selectedSection.start_date,
          end_date: selectedSection.end_date,
        },
      }));

      // Zet de sectie met zijn taken in de state
      const finalSection: SectionData = {
        id: selectedSection.id,
        section_name: selectedSection.section_name,
        start_date: selectedSection.start_date,
        end_date: selectedSection.end_date,
        tasks: tasksWithSection,
      };

      setSections([finalSection]); // ← belangrijk: enkele sectie in state
    } catch (error: any) {
      console.error("Fout bij laden van sectie:", error.message);
    } finally {
      setLoading(false);
    }
  }

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

  async function handleRenameSection() {
    try {
      await updateSectionName(id as string, sectionName);
      setEditing(false);
    } catch (err) {
      Alert.alert("Fout", "Kon sectienaam niet aanpassen.");
    }
  }

  async function handleDeleteSection() {
    try {
      const result = await deleteSectionWithCheck(id as string);
      if (result === "has_tasks") {
        Alert.alert(
          "Let op",
          "Deze sectie bevat nog taken. Verwijder eerst de taken voordat je de sectie verwijdert."
        );
      } else {
        router.back();
      }
    } catch (err) {
      Alert.alert("Fout", "Sectie kon niet verwijderd worden.");
    }
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
        {/* <AppText style={styles.headerText}>{sections[0].section_name}</AppText> */}
      </View>

      {/* FlatList met secties en taken (gefilterd op done/in progress) */}
      <FlatList
        data={sections}
        keyExtractor={(sec) => sec.id}
        renderItem={({ item: sec }) => (
          <View style={styles.sectionContainer}>
            <AppText style={styles.sectionTitle}>{sec.section_name}</AppText>

            {sec.tasks.map((task) => {
              const meta = STATUS_META[task.status as keyof typeof STATUS_META] || {
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
                  <Pressable style={styles.taskTextContainer} onPress={() => openModal({ ...task })}>
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
            {/* Button om een nieuwe taak toe te voegen aan de sectie */}
            <TouchableOpacity style={styles.addTaskButton} onPress={() => openAddTaskModal(sec.id)}>
              <AppText style={styles.addTaskText}>+ Voeg taak toe</AppText>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={closeAddTaskModal}>
            {/* Stop propagatie zodat klikken binnen de modal de modal niet sluit */}
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <AppText style={styles.modalTitle}>Nieuwe taak</AppText>
              <TextInput
                style={styles.input}
                value={newTaskName}
                onChangeText={setNewTaskName}
                placeholder="Naam van de taak"
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleCreateTask}>
                <AppText style={styles.saveButtonText}>Opslaan</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={closeAddTaskModal}>
                <AppText style={styles.cancelButtonText}>Annuleren</AppText>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

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
        onEditTask={handleEditTask}
        onSetSkip={handleSetSkip}
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },

  /* Add task button */
  addTaskButton: { marginTop: 16, paddingVertical: 0 },
  addTaskText: { color: "#666" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: Platform.select({
      ios: 35,
      android: 15,
    }),
    backgroundColor: "#fff",

    // ✅ Shadow voor iOS:
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,

    // ✅ Elevation voor Android:
    elevation: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, color: "#333" },
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

  /* Task item row */
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
});
