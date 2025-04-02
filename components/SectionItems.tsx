import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
  task_templates: Task[];
};

type Props = {
  sections: SectionData[];
  onPressSection: (sectionId: string) => void;
};

export default function SectionItems({ sections, onPressSection }: Props) {
  return (
    <View style={styles.container}>
      {sections.map((section) => {
        const activeCount = section.task_templates.filter((task) => task.status === "active").length ?? 0;

        return (
          <TouchableOpacity
            key={section.id}
            style={styles.sectionItem}
            onPress={() => onPressSection(section.id)}
          >
            <Text style={styles.count}>{activeCount}</Text>
            <Text style={styles.sectionName}>{section.section_name}</Text>
            <Ionicons name="chevron-forward" size={24} color="black" />
          </TouchableOpacity>
        );
      })}
    </View>
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
    marginRight: 8,
    fontWeight: "bold",
    color: "#666",
  },
  sectionName: {
    fontSize: 16,
    color: "#333",
  },
});
