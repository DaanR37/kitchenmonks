import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CalendarModal from "./CalendarModal";
import AppText from "@/components/AppText";

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

export function formatDateString(dateString: string): string {
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return dateString;

  const day = dateObj.getDate();
  const month = dateObj.toLocaleString("nl-NL", { month: "short" });

  return `${day} ${month}`;
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const { width, height } = useWindowDimensions();
  const isTabletLandscape = width > 800 && width > height;
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
    <View style={[styles.dateContainer, isTabletLandscape && styles.dateContainerTablet]}>
      <View style={[styles.dateOval, isTabletLandscape && styles.dateOvalTablet]}>
        {/* Vorige dag */}
        <TouchableOpacity
          style={[styles.chevronCircle, isTabletLandscape && styles.chevronCircleTablet]}
          onPress={() => onDateChange(getPrevDate(selectedDate))}
        >
          <Ionicons style={[styles.chevronIcon, isTabletLandscape && styles.chevronIconTablet]} name="chevron-back" size={12} />
        </TouchableOpacity>

        {/* Tikken op de datumtekst opent de kalender-modal */}
        <TouchableOpacity onPress={handlePressDateText}>
          <AppText style={[styles.dateText, isTabletLandscape && styles.dateTextTablet]}>{displayText}</AppText>
        </TouchableOpacity>

        {/* Volgende dag */}
        <TouchableOpacity
          style={[styles.chevronCircle, isTabletLandscape && styles.chevronCircleTablet]}
          onPress={() => onDateChange(getNextDate(selectedDate))}
        >
          <Ionicons style={[styles.chevronIcon, isTabletLandscape && styles.chevronIconTablet]} name="chevron-forward" size={12} />
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
    padding: 7,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  chevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  chevronIcon: {
    color: "#000",
  },
  dateText: {
    fontSize: 15,
    // marginHorizontal: 8,
    // fontWeight: "600",
  },

  // -- Tablet view --
  dateContainerTablet: {
    // marginVertical: 12,
  },
  dateOvalTablet: {
    padding: 7,
  },
  chevronCircleTablet: {
    width: 28,
    height: 28,
    borderRadius: 14, 
  },
  chevronIconTablet: {
    color: "#000",
    fontSize: 16,
  },
  dateTextTablet: {
    fontSize: 18,
    marginHorizontal: 11,
  },
});
