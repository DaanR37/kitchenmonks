import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  ListHeaderComponent: React.ReactElement | React.ComponentType<any> | null;
};

export default function SectionItems({
  sections,
  onPressSection,
  activeTasksCountPerSection,
  ListHeaderComponent,
}: Props) {
  /* Render functie voor een enkele sectie-item */
  const renderItem = ({ item }: { item: SectionData }) => {
    /* Haal het aantal actieve taken voor deze sectie op via de meegegeven prop */
    const activeCount = activeTasksCountPerSection[item.id] ?? 0;
    return (
      <TouchableOpacity style={styles.sectionItem} onPress={() => onPressSection(item.id)}>
        <View style={styles.countCircle}>
          <Text style={styles.count}>{activeCount}</Text>
        </View>
        <Text style={styles.sectionName}>{item.section_name}</Text>
        <Ionicons name="chevron-forward" size={14} color="black" />
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
      ListHeaderComponent={ListHeaderComponent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  countCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  count: {
    fontWeight: "700",
    color: "#333",
  },
  sectionName: {
    flex: 1 /* Hiermee wordt de naam over de beschikbare ruimte verdeeld */,
    fontSize: 16,
    color: "#333",
  },
});
