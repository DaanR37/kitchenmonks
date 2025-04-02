import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type DateSelectorProps = {
  selectedDate: string /* bv. "2025-03-20" */;
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

/* Check of de ISO-string gelijk is aan 'vandaag' */
function isToday(dateString: string): boolean {
  const todayISO = new Date().toISOString().split("T")[0];
  return dateString === todayISO;
}

function isTomorrow(dateString: string): boolean {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const tomorrowISO = date.toISOString().split("T")[0];
  return dateString === tomorrowISO;
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  /* Bepaal wat er in de UI getoond moet worden: "Today", "Tomorrow" of de datum zelf) */
  let displayText = selectedDate;
  if (isToday(selectedDate)) {
    displayText = "Today";
  } else if (isTomorrow(selectedDate)) {
    displayText = "Tomorrow";
  }

  return (
    <View style={styles.dateContainer}>
      <View style={styles.dateOval}>
        <TouchableOpacity
          style={styles.chevronCircle}
          onPress={() => onDateChange(getPrevDate(selectedDate))}
        >
          <Ionicons name="chevron-back" size={14} color="#000" />
        </TouchableOpacity>

        {/* Wordt later vervangen voor dynamische datum-aanduiding */}
        <Text style={styles.dateText}>{displayText}</Text>

        <TouchableOpacity
          style={styles.chevronCircle}
          onPress={() => onDateChange(getNextDate(selectedDate))}
        >
          <Ionicons name="chevron-forward" size={14} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
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
