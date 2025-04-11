import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

type StatsSectionProps = {
  allPercentage: number;
  outOfStockCount: number;
  myTasksCount: number;
  inactiveTasksCount: number;
};

export default function StatsSection({
  allPercentage,
  outOfStockCount,
  myTasksCount,
  inactiveTasksCount,
}: StatsSectionProps) {
  const router = useRouter();

  return (
    <View style={styles.statsContainer}>
      {/* Rij 1, met "All" (links) en "Out of stock" (rechts) */}
      <View style={styles.statsRow}>
        {/* All */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/allTasks")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#0066ff" }]} />
            <Text style={styles.statLabel}>All</Text>
          </View>
          {/* Toon percentage voltooide taken */}
          <Text style={styles.statValue}>{allPercentage}%</Text>
        </TouchableOpacity>

        {/* Out of stock */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/outOfStock")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#FF6347" }]} />
            <Text style={styles.statLabel}>Out of stock</Text>
          </View>
          {/* Toon aantal out of stock taken */}
          <Text style={styles.statValue}>{outOfStockCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Rij 2, met "My tasks" (links) en "Inactive" (rechts) */}
      <View style={styles.statsRow}>
        {/* My tasks */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/myTasks")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#ff9000" }]} />
            <Text style={styles.statLabel}>My tasks</Text>
          </View>
          <Text style={styles.statValue}>{myTasksCount}</Text>
        </TouchableOpacity>

        {/* Inactive tasks */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/inactive")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#00bb06" }]} />
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
          <Text style={styles.statValue}>{inactiveTasksCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    marginVertical: 16,
  },
  // Een rij met twee boxen naast elkaar
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12, // beetje extra ruimte tussen rijen
  },
  // Standaard-’box’ voor de statistiek, halve breedte
  statBox: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    // Optioneel: schaduw, elevation etc.
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  // De linkerhelft van statBox, met een kleine circle en een titel
  statLeft: {
    flexDirection: "column",
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
    color: "#333",
  },
  // De (hoofd)waarde die aan de rechterkant wordt weergegeven
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    alignSelf: "center",
  },
});
