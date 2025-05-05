import React from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, useWindowDimensions } from "react-native";
import AppText from "@/components/AppText";

type Task = {
  id: string;
  status: string;
  task_name: string;
  start_date: string;
  end_date: string;
};

export type SectionData = {
  id: string;
  section_name: string;
  start_date: string;
  end_date: string;
  task_templates: Task[];
};

type Props = {
  sections: SectionData[];
  onPressSection: (sectionId: string) => void;
  activeTasksCountPerSection: Record<string, number>;
};

export default function SectionItems({ sections, onPressSection, activeTasksCountPerSection }: Props) {
  const { width, height } = useWindowDimensions();
  const isTabletLandscape = width > 800 && width > height;

  /* Render functie voor een enkele sectie-item */
  const renderItem = ({ item }: { item: SectionData }) => {
    /* Haal het aantal actieve taken voor deze sectie op via de meegegeven prop */
    const activeCount = activeTasksCountPerSection[item.id] ?? 0;
    return (
      <TouchableOpacity
        style={[styles.sectionItem, isTabletLandscape && styles.sectionItemTablet]}
        onPress={() => onPressSection(item.id)}
      >
        <View style={[styles.countCircle, isTabletLandscape && styles.countCircleTablet]}>
          <AppText style={[styles.count, isTabletLandscape && styles.countTablet]}>{activeCount}</AppText>
        </View>
        <AppText style={[styles.sectionName, isTabletLandscape && styles.sectionNameTablet]}>
          {item.section_name}
        </AppText>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      keyboardShouldPersistTaps="always"
    />
  );
}

const styles = StyleSheet.create({
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginVertical: 6,
    borderRadius: 8,
  },
  countCircle: {
    width: 28,
    height: 28,
    marginRight: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  count: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  sectionName: {
    fontSize: 14,
    color: "#333",
  },

  // -- Tablet view --
  sectionItemTablet: {
    // paddingHorizontal: 16,
    marginVertical: 12,
  },
  countCircleTablet: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  countTablet: {
    fontSize: 18,
  },
  sectionNameTablet: {
    fontSize: 18,
  },
});
