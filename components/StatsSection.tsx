import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

type StatsSectionProps = {
  allPercentage: number;
  teamMepCount: number;
  myMepCount: number;
  outOfStockCount: number;
};

export default function StatsSection({
  allPercentage,
  teamMepCount,
  myMepCount,
  outOfStockCount,
}: StatsSectionProps) {
  const router = useRouter();

  return (
    <View style={styles.statsContainer}>
      {/* Rij 1, met "All" (links) en "Out of stock" (rechts) */}
      <View style={styles.statsRow}>
        {/* All */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/allTasks")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#0066ff" }]}>
              <Ionicons name="layers-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.statLabel}>All</Text>
          </View>
          {/* Toon percentage voltooide taken */}
          <Text style={styles.statValue}>{allPercentage}%</Text>
        </TouchableOpacity>

        {/* Team MEP */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/teamMep")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#00bb06" }]}>
              <Ionicons name="people-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.statLabel}>Team MEP</Text>
          </View>
          <Text style={styles.statValue}>{teamMepCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Rij 2, met "My tasks" (links) en "Inactive" (rechts) */}
      <View style={styles.statsRow}>
        {/* My MEP */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/myMep")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#ff9000" }]}>
              <Ionicons name="person-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.statLabel}>My MEP</Text>
          </View>
          <Text style={styles.statValue}>{myMepCount}</Text>
        </TouchableOpacity>

        {/* Out of stock */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/outOfStock")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#FF6347" }]}>
              <Ionicons name="cart-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.statLabel}>Out of stock</Text>
          </View>
          {/* Toon aantal out of stock taken */}
          <Text style={styles.statValue}>{outOfStockCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statLeft: {
    flexDirection: "column",
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 0,
    color: "#333",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
});
