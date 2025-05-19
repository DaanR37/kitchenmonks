import { useRef, useState } from "react";
import {
  assignTaskInstance,
  updateTaskInstanceDone,
  updateTaskInstanceInProgress,
  updateTaskInstanceStatus,
  updateTaskInstanceSkip,
  deleteTaskInstance,
} from "@/services/api/taskInstances";
import { updateTaskTemplateName } from "@/services/api/taskTemplates";

export type TaskRow = {
  id: string;
  task_name: string;
  status: string;
  date: string;
  assigned_to?: string[];
  task_template_id: string;
  section_id: string;
  deleted?: boolean;
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

export default function useTaskModal({
  sections,
  setSections,
}: {
  sections: SectionData[];
  setSections: (sections: SectionData[] | ((prev: SectionData[]) => SectionData[])) => void;
}) {
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const selectedTaskRef = useRef<TaskRow | null>(null);
  // const [showEditTaskModal, setShowEditTaskModal] = useState(false);

  function openModal(task: TaskRow) {
    selectedTaskRef.current = task;
    setSelectedTask(task); // wel voor render
    setShowDetailsModal(true);
  }

  // function openModal(task: TaskRow) {
  //   setSelectedTask(task);
  //   setShowDetailsModal(true);
  // }

  function closeModal() {
    selectedTaskRef.current = null;
    setSelectedTask(null);
    setShowDetailsModal(false);
  }

  // function closeModal() {
  //   setSelectedTask(null);
  //   setShowDetailsModal(false);
  // }

  function refreshSingleStatus(status: string, assigned_to: string[] = selectedTask?.assigned_to ?? []) {
    if (!selectedTask) return;
    const updated = { ...selectedTask, status, assigned_to };
    setSelectedTask(updated);
    setSections(
      sections.map((sec) =>
        sec.id !== updated.section.id
          ? sec
          : { ...sec, tasks: sec.tasks.map((t) => (t.id === updated.id ? updated : t)) }
      )
    );
  }

  async function handleEditTask(newName: string) {
    if (!selectedTask) return;

    try {
      await updateTaskTemplateName(selectedTask.task_template_id, newName);

      const updatedTask = { ...selectedTask, task_name: newName };
      setSelectedTask(updatedTask);

      /* Update secties in context */
      setSections((prev: SectionData[]) =>
        prev.map((sec: SectionData) =>
          sec.id !== selectedTask.section.id
            ? sec
            : {
                ...sec,
                tasks: sec.tasks.map((task: TaskRow) => (task.id === selectedTask.id ? updatedTask : task)),
              }
        )
      );
    } catch (error) {
      console.error("Fout bij bijwerken taaknaam:", error);
    }
  }

  // async function handleDeleteTask() {
  //   if (!selectedTask) return;

  //   try {
  //     // 1. Verwijder uit DB
  //     await deleteTaskInstance(selectedTask.id);

  //     // 2. Update lokale state
  //     setSections((prev) =>
  //       prev.map((sec) =>
  //         sec.id !== selectedTask.section.id
  //           ? sec
  //           : {
  //               ...sec,
  //               tasks: sec.tasks.filter((t) => t.id !== selectedTask.id),
  //             }
  //       )
  //     );

  //     // 3. Sluit modals en clear task
  //     setSelectedTask(null);
  //     setShowDetailsModal(false);
  //   } catch (err) {
  //     console.error("Fout bij verwijderen taak:", err);
  //   }
  // }

  async function handleDeleteTask() {
    if (!selectedTask) return;

    try {
      await deleteTaskInstance(selectedTask.id);

      // ❗ Filter de task direct uit lokale state:
      setSections((prev) =>
        prev.map((sec) =>
          sec.id === selectedTask.section.id
            ? {
                ...sec,
                tasks: sec.tasks.filter((task) => task.id !== selectedTask.id),
              }
            : sec
        )
      );

      // ❗ Sluit de modals netjes af
      closeModal();
    } catch (error) {
      console.error("Fout bij verwijderen taak:", error);
    }
  }

  async function handleToggleAssignTask(profileId: string) {
    if (!selectedTask) return;
    const current = selectedTask.assigned_to ?? [];
    const next = current.includes(profileId)
      ? current.filter((id) => id !== profileId)
      : [...current, profileId];
    const newStatus = next.length > 0 ? "active" : "inactive";

    await assignTaskInstance(selectedTask.id, next);
    await updateTaskInstanceStatus(selectedTask.id, newStatus);
    refreshSingleStatus(newStatus, next);
  }

  async function handleSetDone() {
    if (!selectedTask) return;
    await updateTaskInstanceDone(selectedTask.id);
    refreshSingleStatus("done");
  }

  async function handleSetInProgress() {
    if (!selectedTask) return;
    await updateTaskInstanceInProgress(selectedTask.id);
    refreshSingleStatus("in progress");
  }

  async function handleSetActiveTask() {
    if (!selectedTask) return;
    await updateTaskInstanceStatus(selectedTask.id, "active");
    refreshSingleStatus("active");
  }

  async function handleSetInactiveTask() {
    if (!selectedTask) return;
    await updateTaskInstanceStatus(selectedTask.id, "inactive");
    await assignTaskInstance(selectedTask.id, []);
    refreshSingleStatus("inactive", []);
  }

  async function handleSetOutOfStock() {
    if (!selectedTask) return;
    await updateTaskInstanceStatus(selectedTask.id, "out of stock");
    refreshSingleStatus("out of stock");
  }

  async function handleSetSkip() {
    if (!selectedTask) return;
    await updateTaskInstanceSkip(selectedTask.id);
    refreshSingleStatus("skip");
  }

  return {
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
    selectedTaskRef,
  };
}
