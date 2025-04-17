import React, { useState } from "react";
import { Modal, Pressable, TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";

type CalendarModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

export default function CalendarModal({ visible, onClose, selectedDate, onSelectDate }: CalendarModalProps) {
  const [tempDate, setTempDate] = useState(selectedDate);

  /* Gebruiker klikt op een dag */
  const handleDayPress = (day: any) => {
    setTempDate(day.dateString);
  };

  /* Gebruiker klikt op Reset */
  const handleReset = () => {
    // evt. terugzetten op "vandaag" (of je selectedDate)
    const todayISO = new Date().toISOString().split("T")[0];
    setTempDate(todayISO);
  };

  /* Gebruiker klikt op Done */
  const handleDone = () => {
    onSelectDate(tempDate);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Door op de semi-transparante overlay te klikken, sluit je de modal */}
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        {/* StopPropagation zodat een klik binnen de 'modalContainer' de modal niet sluit */}
        <Pressable style={modalStyles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <Text style={modalStyles.title}>Selecteer een datum</Text>

          {/* De kalender uit react-native-calendars */}
          <Calendar
            current={tempDate}
            onDayPress={handleDayPress}
            markedDates={{
              [tempDate]: { selected: true, selectedColor: "#6C63FF" },
            }}
            theme={{
              // Optioneel: styling van de kalender
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 14,
            }}
          />

          {/* Onderste knoppenrij */}
          <View style={modalStyles.buttonRow}>
            <TouchableOpacity onPress={handleReset} style={modalStyles.resetButton}>
              <Text style={modalStyles.resetButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDone} style={modalStyles.doneButton}>
              <Text style={modalStyles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ddd",
    borderRadius: 8,
  },
  resetButtonText: {
    color: "#333",
    fontWeight: "500",
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#6C63FF",
    borderRadius: 8,
  },
  doneButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
