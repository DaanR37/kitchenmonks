import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CalendarModal from "./CalendarModal";

type DateSelectorProps = {
  selectedDate: string;
  onDateChange: (newDate: string) => void /* callback om de datum te wijzigen */;
};

function getPrevDate(currentDate: string): string {
  const date = new Date(currentDate);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

function getNextDate(currentDate: string): string {
  const date = new Date(currentDate);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

function isToday(dateString: string): boolean {
  const todayISO = new Date().toISOString().split("T")[0];
  return dateString === todayISO;
}

function isYesterday(dateString: string): boolean {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const yesterdayISO = date.toISOString().split("T")[0];
  return dateString === yesterdayISO;
}

function isTomorrow(dateString: string): boolean {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const tomorrowISO = date.toISOString().split("T")[0];
  return dateString === tomorrowISO;
}

function formatDateString(dateString: string): string {
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return dateString;
  return dateObj.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [calendarVisible, setCalendarVisible] = useState(false);

  let displayText = selectedDate;
  if (isToday(selectedDate)) {
    displayText = "Vandaag";
  } else if (isYesterday(selectedDate)) {
    displayText = "Gisteren";
  } else if (isTomorrow(selectedDate)) {
    displayText = "Morgen";
  } else {
    displayText = formatDateString(selectedDate);
  }

  /* Bij tikken op de datumtekst → open de kalender-modal */
  const handlePressDateText = () => {
    setCalendarVisible(true);
  };

  /* Bij tikken op Done → sluit de kalender-modal en wijzigt de datum */
  const handleSelectDate = (newDate: string) => {
    onDateChange(newDate);
    setCalendarVisible(false);
  };

  return (
    <View style={styles.dateContainer}>
      <View style={styles.dateOval}>
        {/* Vorige dag */}
        <TouchableOpacity
          style={styles.chevronCircle}
          onPress={() => onDateChange(getPrevDate(selectedDate))}
        >
          <Ionicons name="chevron-back" size={14} color="#000" />
        </TouchableOpacity>

        {/* Tikken op de datumtekst opent de kalender-modal */}
        <TouchableOpacity onPress={handlePressDateText}>
          <Text style={styles.dateText}>{displayText}</Text>
        </TouchableOpacity>

        {/* Volgende dag */}
        <TouchableOpacity
          style={styles.chevronCircle}
          onPress={() => onDateChange(getNextDate(selectedDate))}
        >
          <Ionicons name="chevron-forward" size={14} color="#000" />
        </TouchableOpacity>
      </View>

      {/* De modal met de Calendar erin */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dateContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 0,
  },
  dateOval: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 8,
  },
  chevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 12,
    backgroundColor: "#eaeaea",
    alignItems: "center",
    justifyContent: "center",
  },
});
