import React from "react";
import { Modal, Pressable, View, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AppText from "@/components/AppText";
import { ProfileData } from "@/services/ProfileContext";
import { StatusMeta } from "@/constants/statusMeta";

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

interface TaskDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTask: TaskRow | null;
  allProfiles: ProfileData[];
  STATUS_META: Record<string, StatusMeta>;
  onAssignToggle: (profileId: string) => void;
  onSetDone: () => void;
  onSetInProgress: () => void;
  onSetActive: () => void;
  onSetInactive: () => void;
  onSetOutOfStock: () => void;
  cleanTaskName: (name: string) => string;
  generateInitials: (firstName?: string, lastName?: string) => string;
  getColorFromId: (id: string) => string;
}

export default function TaskDetailsModal({
  visible,
  onClose,
  selectedTask,
  allProfiles,
  STATUS_META,
  onAssignToggle,
  onSetDone,
  onSetInProgress,
  onSetActive,
  onSetInactive,
  onSetOutOfStock,
  cleanTaskName,
  generateInitials,
  getColorFromId,
}: TaskDetailsModalProps) {
  if (!selectedTask) return null;

  const renderStatusButtons = () => {
    const rows = [
      ["done", "in progress"],
      ["active", "out of stock"],
      ["inactive", "edit"],
    ];

    const handleStatusChange = (statusKey: string) => {
      switch (statusKey) {
        case "done":
          return onSetDone();
        case "in progress":
          return onSetInProgress();
        case "active":
          return onSetActive();
        case "inactive":
          return onSetInactive();
        case "out of stock":
          return onSetOutOfStock();
        case "edit":
          return onSetActive(); // edit maps to active
      }
    };

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.statusGridRow}>
        {row.map((statusKey) => {
          const meta = STATUS_META[statusKey];
          const isSelected = selectedTask.status === statusKey;

          return (
            <TouchableOpacity
              key={statusKey}
              style={[
                styles.statusOval,
                isSelected && {
                  backgroundColor: "#e5f4e0",
                  borderColor: "#2e8b57",
                  borderWidth: 2,
                },
              ]}
              onPress={() => handleStatusChange(statusKey)}
            >
              <View
                style={[
                  styles.statusOvalCircle,
                  { backgroundColor: meta.backgroundColor },
                  meta.borderColor ? { borderWidth: 1, borderColor: meta.borderColor } : {},
                ]}
              >
                {meta.icon && <Ionicons name={meta.icon} size={14} color={meta.iconColor || "#000"} />}
              </View>
              <AppText
                style={[styles.statusOvalLabel, isSelected && { color: "#2e8b57", fontWeight: "bold" }]}
              >
                {statusKey === "in progress"
                  ? "In progress"
                  : statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

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
              onPress={() => onAssignToggle(profile.id)}
              key={profile.id}
            >
              <AppText style={styles.profileBubbleText}>{initials}</AppText>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  // const statusButtons = [
  //   { label: "Done", handler: onSetDone },
  //   { label: "In progress", handler: onSetInProgress },
  //   { label: "Active", handler: onSetActive },
  //   { label: "Inactive", handler: onSetInactive },
  //   { label: "Out of stock", handler: onSetOutOfStock },
  // ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.bottomModalContainer} onPress={(e) => e.stopPropagation()}>
          <AppText style={styles.modalTaskTitle}>{cleanTaskName(selectedTask.task_name)}</AppText>
          <AppText style={styles.assignTitle}>Assign to:</AppText>
          {renderProfileBubbles()}

          <View style={styles.statusGridContainer}>
            <AppText style={styles.statusGridTitle}>Status</AppText>
            {renderStatusButtons()}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
  },
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
