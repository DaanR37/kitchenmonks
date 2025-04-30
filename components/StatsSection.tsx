import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AppText from "@/components/AppText";

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
              <Ionicons name="layers-outline" size={14} color="#fff" />
            </View>
            <AppText style={styles.statLabel}>All</AppText>
          </View>
          {/* Toon percentage voltooide taken */}
          <AppText style={styles.statValue}>{allPercentage}%</AppText>
        </TouchableOpacity>

        {/* Team MEP */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/teamMep")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#00bb06" }]}>
              <Ionicons name="people-outline" size={14} color="#fff" />
            </View>
            <AppText style={styles.statLabel}>Team MEP</AppText>
          </View>
          <AppText style={styles.statValue}>{teamMepCount}</AppText>
        </TouchableOpacity>
      </View>

      {/* Rij 2, met "My tasks" (links) en "Inactive" (rechts) */}
      <View style={styles.statsRow}>
        {/* My MEP */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/myMep")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#ff9000" }]}>
              <Ionicons name="person-outline" size={14} color="#fff" />
            </View>
            <AppText style={styles.statLabel}>My MEP</AppText>
          </View>
          <AppText style={styles.statValue}>{myMepCount}</AppText>
        </TouchableOpacity>

        {/* Out of stock */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/outOfStock")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#FF6347" }]}>
              <Ionicons name="cart-outline" size={14} color="#fff" />
            </View>
            <AppText style={styles.statLabel}>Out of stock</AppText>
          </View>
          {/* Toon aantal out of stock taken */}
          <AppText style={styles.statValue}>{outOfStockCount}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    marginVertical: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "48%",
    padding: 12,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.1)",
    backgroundColor: "#ffffff",
  },
  statLeft: {
    flexDirection: "column",
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    // marginTop: 2,
    // marginBottom: 0,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  statValue: {
    fontSize: 24,
    color: "#333",
  },
});
