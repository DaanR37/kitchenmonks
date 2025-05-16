import React, { useState } from "react";
import {
  Modal,
  View,
  Pressable,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AppText from "@/components/AppText";

interface EditTaskModalProps {
  visible: boolean;
  taskName: string;
  onSave: (newName: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function EditTaskModal({ visible, taskName, onSave, onDelete, onClose }: EditTaskModalProps) {
  const [newName, setNewName] = useState(taskName);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <AppText style={styles.modalTitle}>Taak bewerken</AppText>

            {/* Input Field */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nieuwe taaknaam"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor="#666"
                autoCorrect={false}
              />
            </View>

            {/* Save Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={() => onSave(newName)}>
                <AppText style={styles.saveButtonText}>Opslaan</AppText>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                <AppText style={styles.deleteButtonText}>Verwijderen</AppText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  modalContent: {
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
    backgroundColor: "#fff",
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

  /* Buttons */
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
    backgroundColor: "#017cff99",
    // backgroundColor: "#000",
  },
  saveButtonText: {
    color: "#000",
    fontSize: 17,
    // color: "#fff",
    // fontWeight: "bold",
  },
  deleteButton: {
    padding: 16,
    marginTop: 0,
    borderRadius: 50,
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#f61212",
  },
  deleteButtonText: {
    color: "#000",
    fontSize: 17,
    // fontWeight: "bold",
  },
});
