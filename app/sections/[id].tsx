import { useEffect, useState, useContext, useCallback } from "react";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AuthContext } from "@/services/AuthContext";
import { DateContext } from "@/services/DateContext";
import { ProfileData } from "@/services/ProfileContext";
import CalendarModal from "@/components/CalendarModal";
import { updateSection, deleteSectionWithCheck, fetchSections } from "@/services/api/sections";
import { getTasksForSectionOnDate } from "@/services/api/taskHelpers";
import { createTaskTemplate } from "@/services/api/taskTemplates";
import { fetchProfiles } from "@/services/api/profiles";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import AppText from "@/components/AppText";
import useTaskModal, { TaskRow, SectionData } from "@/hooks/useTaskModal";
import { STATUS_META } from "@/constants/statusMeta";
import { cleanTaskName, generateInitials, getColorFromId } from "@/utils/taskUtils";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatDateString } from "@/components/DateSelector";
import { supabase } from "@/services/supabaseClient";

export default function SingleSectionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useContext(AuthContext);
  const { selectedDate } = useContext(DateContext);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);

  /* State voor "Add Task" modal */
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [addTaskSectionId, setAddTaskSectionId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");

  /* State voor "Edit/Delete" section modal */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSectionName, setEditSectionName] = useState("");
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editSectionEndDate, setEditSectionEndDate] = useState<string>(selectedDate);
  const [showEditEndDatePicker, setShowEditEndDatePicker] = useState(false);

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
    handleDeleteTask,
    handleSetSkip,
  } = useTaskModal({ sections, setSections });

  useFocusEffect(
    useCallback(() => {
      if (typeof id === "string") {
        loadData(id);
      }
    }, [id, user, selectedDate])
  );

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

  const loadSectionMeta = async (sectionId: string) => {
    const kitchenId = user?.user_metadata?.kitchen_id;
    if (!kitchenId) return null;
    const allSections = await fetchSections(kitchenId, selectedDate);
    return allSections.find((sec: any) => sec.id === sectionId) || null;
  };

  const loadSectionTasks = async (sectionId: string, sectionMeta: any) => {
    const tasks = await getTasksForSectionOnDate(sectionId, selectedDate);
    return tasks.map((task: any) => ({
      ...task,
      section: {
        id: sectionMeta.id,
        section_name: sectionMeta.section_name,
        start_date: sectionMeta.start_date,
        end_date: sectionMeta.end_date,
      },
    }));
  };

  const loadData = async (sectionId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const sectionMeta = await loadSectionMeta(sectionId);
      if (!sectionMeta) return;

      const tasks = await loadSectionTasks(sectionId, sectionMeta);

      setSections([
        {
          id: sectionMeta.id,
          section_name: sectionMeta.section_name,
          start_date: sectionMeta.start_date,
          end_date: sectionMeta.end_date,
          tasks,
        },
      ]);
    } catch (error) {
      console.error("Fout bij laden van sectie:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!user) return;
    const kitchenId = user.user_metadata?.kitchen_id;
    if (!kitchenId || !addTaskSectionId || !newTaskName.trim()) return;

    const sectionObj = sections.find((sec) => sec.id === addTaskSectionId);
    if (!sectionObj) return;

    try {
      const newTemplate = await createTaskTemplate(
        addTaskSectionId,
        newTaskName + " " + new Date().getTime(),
        sectionObj.start_date,
        sectionObj.end_date
      );

      const newTask = {
        task_template_id: newTemplate.id,
        date: selectedDate,
        task_name: newTaskName,
        assigned_to: [],
        section: {
          id: sectionObj.id,
          section_name: sectionObj.section_name,
        },
      };

      const updatedSections = sections.map((sec) =>
        sec.id === addTaskSectionId ? { ...sec, tasks: [...sec.tasks, newTask] } : sec
      );

      setSections(updatedSections as SectionData[]);
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setAddTaskModalVisible(false);
      setNewTaskName("");
    }
  };

  /* Handler om changes in de modal op te slaan */
  const handleSaveEditSection = async () => {
    if (!editSectionId || !editSectionName.trim()) return;
    try {
      await updateSection(editSectionId, editSectionName.trim(), editSectionEndDate);

      /* Update de lokale state */
      const updatedSections = sections.map((s) =>
        s.id === editSectionId
          ? { ...s, section_name: editSectionName.trim(), end_date: editSectionEndDate }
          : s
      );
      setSections(updatedSections);
      setShowEditModal(false);
    } catch (error) {
      console.error("Fout bij bewerken menu-item:", error);
      alert("Er ging iets mis bij het opslaan.");
    }
  };

  /* Handler om de sectie te verwijderen */
  const handleDeleteSection = async () => {
    if (!editSectionId) return;
    try {
      const result = await deleteSectionWithCheck(editSectionId);
      if (result === "has_tasks") {
        alert("Deze sectie bevat nog taken en kan niet verwijderd worden.");
        return;
      }

      const updated = sections.filter((s) => s.id !== editSectionId);
      setSections(updated);

      router.back();
      setShowEditModal(false);
      setEditSectionId(null);
      setEditSectionName("");
    } catch (error) {
      console.error("Fout bij verwijderen menu-item:", error);
      alert("Verwijderen is mislukt.");
    }
  };

  /* Handle the circle press */
  const handleCirclePress = async (task: TaskRow) => {
    await handleSetDone();
    openModal({ ...task, status: "done" });
  };

  /* ------------------------------------------------------------ */

  /* Handlers voor de "Nieuwe taak" modal */
  const openAddTaskModal = (sectionId: string) => {
    setAddTaskSectionId(sectionId);
    setNewTaskName("");
    setAddTaskModalVisible(true);
  }
  const closeAddTaskModal = () => {
    setAddTaskSectionId(null);
    setNewTaskName("");
    setAddTaskModalVisible(false);
  }

  /* Handle the "Edit/Delete" section modal */
  const handleShowEditModal = (section: SectionData) => {
    setEditSectionId(section.id);
    setEditSectionName(section.section_name);
    setEditSectionEndDate(section.end_date);
    setShowEditModal(true);
  };

  /* Add Task & Edit Section Modals */
  const renderAddTaskModal = () => {
    return (
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
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <AppText style={styles.modalTitle}>Nieuwe taak</AppText>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newTaskName}
                  onChangeText={setNewTaskName}
                  placeholder="Naam van de taak"
                />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleCreateTask}>
                  <AppText style={styles.saveButtonText}>Opslaan</AppText>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  };
  const renderEditSectionModal = () => {
    return (
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <AppText style={styles.modalTitle}>Menu-item bewerken</AppText>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={editSectionName}
                  onChangeText={setEditSectionName}
                  placeholder="Naam menu-item"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>

              {/* Kiezen van einddatum */}
              <View style={styles.datePickerContainer}>
                <AppText style={styles.label}>Einddatum</AppText>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowEditEndDatePicker(true)}
                >
                  <AppText style={styles.datePickerText}>{formatDateString(editSectionEndDate)}</AppText>
                </TouchableOpacity>
              </View>

              {/* Save Section Button */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEditSection}>
                  <AppText style={styles.saveButtonText}>Opslaan</AppText>
                </TouchableOpacity>

                {/* Delete Section Button */}
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSection}>
                  <AppText style={styles.deleteButtonText}>Verwijderen</AppText>
                </TouchableOpacity>
              </View>

              <CalendarModal
                visible={showEditEndDatePicker}
                selectedDate={editSectionEndDate}
                onClose={() => setShowEditEndDatePicker(false)}
                onSelectDate={(date) => {
                  setEditSectionEndDate(date);
                  setShowEditEndDatePicker(false);
                }}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
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
            <View style={styles.sectionRow}>
              <AppText style={styles.sectionTitle}>{sec.section_name}</AppText>
              {/* Kebab-menu - drie puntjes) */}
              <TouchableOpacity style={styles.editButton} onPress={() => handleShowEditModal(sec)}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
              </TouchableOpacity>
            </View>

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
              <View style={styles.plusCircle}>
                <Ionicons name="add" size={15} style={{ opacity: 0.5, color: "#333" }} />
              </View>
              <AppText style={styles.addTaskText}>Voeg taak toe</AppText>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Add Task & Edit Section Modals */}
      {renderAddTaskModal()}
      {renderEditSectionModal()}

      {/* Modal voor de taakdetails - Status & Assigned to */}
      <TaskDetailsModal
        // key={selectedTask?.id ?? "static-task-modal"}
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
        // selectedTaskRef={selectedTaskRef}
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

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Section container */
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#fff",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
  },
  editButton: {
    alignItems: "center",
  },

  /* Add task button */
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  addTaskText: { flex: 1, fontSize: 15, color: "#666" },

  /* Task item row */
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    backgroundColor: "#fff",
  },
  taskStatusCircleContainer: {
    alignItems: "center",
    marginRight: 12,
    // width: 1,
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

  /* Task status */
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

  // -- Modal styling --
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 30,
    // Shadow voor iOS:
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    // Elevation voor Android:
    elevation: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },

  /* Input */
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    padding: Platform.select({
      ios: 14,
      android: 12,
    }),
    borderRadius: 8,
    marginVertical: 4,
    fontSize: 16,
    backgroundColor: "#f2f1f6b3",
  },
  datePickerContainer: {
    marginBottom: 12,
  },
  label: {
    marginTop: 6,
    fontSize: 15,
    color: "#333",
  },
  datePickerButton: {
    padding: Platform.select({
      ios: 14,
      android: 12,
    }),
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: "#f2f1f6b3",
  },
  datePickerText: {
    fontSize: 16,
    color: "#333",
  },

  /* Buttons Modal - Edit/Delete */
  buttonContainer: {
    marginBottom: Platform.select({
      ios: 22,
      android: 12,
    }),
  },
  saveButton: {
    padding: 16,
    marginBottom: Platform.select({
      ios: 12,
      android: 8,
    }),
    borderRadius: 50,
    alignItems: "center",
    backgroundColor: "#000",
  },
  saveButtonText: {
    fontSize: 17,
    color: "#fff",
  },
  deleteButton: {
    padding: 16,
    marginTop: 0,
    borderRadius: 50,
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  deleteButtonText: {
    color: "#000",
    fontSize: 17,
  },
});
