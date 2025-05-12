import { useState } from "react";
import {
  assignTaskInstance,
  updateTaskInstanceDone,
  updateTaskInstanceInProgress,
  updateTaskInstanceStatus,
  updateTaskInstanceSkip,
} from "@/services/api/taskInstances";

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

export default function useTaskModal({
  sections,
  setSections,
}: {
  sections: SectionData[];
  setSections: (sections: SectionData[]) => void;
}) {
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  function openModal(task: TaskRow) {
    setSelectedTask(task);
    setShowDetailsModal(true);
  }

  function closeModal() {
    setSelectedTask(null);
    setShowDetailsModal(false);
  }

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

  async function handleEditTask() {
    if (!selectedTask) return;
    console.log("Edit task pressed");
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
    handleSetSkip,
  };
}
