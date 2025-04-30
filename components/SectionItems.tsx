import React from "react";
import { View, StyleSheet, TouchableOpacity, FlatList } from "react-native";
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
  /* Render functie voor een enkele sectie-item */
  const renderItem = ({ item }: { item: SectionData }) => {
    /* Haal het aantal actieve taken voor deze sectie op via de meegegeven prop */
    const activeCount = activeTasksCountPerSection[item.id] ?? 0;
    return (
      <TouchableOpacity style={styles.sectionItem} onPress={() => onPressSection(item.id)}>
        <View style={styles.countCircle}>
          <AppText style={styles.count}>{activeCount}</AppText>
        </View>
        <AppText style={styles.sectionName}>{item.section_name}</AppText>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      style={styles.container}
      data={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: 16 }}
      keyboardShouldPersistTaps="always"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginVertical: 6,
    borderRadius: 8,
  },
  sectionName: {
    fontSize: 14,
    color: "#333",
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
});
