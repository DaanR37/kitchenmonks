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
};

export default function SectionItems({ sections, onPressSection, activeTasksCountPerSection }: Props) {
  /* Render functie voor een enkele sectie-item */
  const renderItem = ({ item }: { item: SectionData }) => {
    /* Haal het aantal actieve taken voor deze sectie op via de meegegeven prop */
    const activeCount = activeTasksCountPerSection[item.id] ?? 0;
    return (
      <TouchableOpacity style={styles.sectionItem} onPress={() => onPressSection(item.id)}>
        {/* Toon het aantal actieve taken */}
        <Text style={styles.count}>{activeCount}</Text>
        {/* Toon de naam van de sectie */}
        <Text style={styles.sectionName}>{item.section_name}</Text>
        {/* Toon een pijltje (chevron) als indicatie dat het item klikbaar is */}
        {/* <Ionicons name="chevron-forward" size={16} color="black" /> */}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      style={styles.container}
      data={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      // Indien gewenst: voeg extra props toe (zoals contentContainerStyle) voor padding of marges
      contentContainerStyle={{ paddingBottom: 16 }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  count: {
    marginRight: 12,
    fontWeight: "bold",
    color: "#666",
  },
  sectionName: {
    // flex: 1, /* Hiermee wordt de naam over de beschikbare ruimte verdeeld */
    fontSize: 16,
    color: "#333",
  },
});
