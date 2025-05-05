import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AppText from "@/components/AppText";

export type StatsSectionProps = {
  allPercentage: number;
  teamMepCount: number;
  myMepCount: number;
  outOfStockCount: number;
  isTablet: boolean;
  activeTab: string;
  onTabSelect: (tab: string) => void;
};

export default function StatsSection({
  allPercentage,
  teamMepCount,
  myMepCount,
  outOfStockCount,
  isTablet,
  activeTab,
  onTabSelect,
}: StatsSectionProps) {
  const router = useRouter();

  return (
    <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
      {/* Rij 1, met "All" (links) en "Team MEP" (rechts) */}
      <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
        {/* All tasks */}
        <TouchableOpacity
          style={[
            styles.statBox,
            isTablet && styles.statBoxTablet,
            isTablet && activeTab === "allTasks" && styles.statBoxActiveAll,
          ]}
          onPress={() => (isTablet ? onTabSelect("allTasks") : router.push("/tasks/allTasks"))}
        >
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#0066ff" }, isTablet && styles.circleTablet]}>
              <Ionicons name="layers-outline" size={15} color="#fff" />
            </View>
            <AppText
              style={[
                styles.statLabel,
                isTablet && styles.statLabelTablet,
                isTablet && activeTab === "allTasks" && styles.statLabelActiveAll,
              ]}
            >
              All
            </AppText>
          </View>
          {/* Toon percentage voltooide taken */}
          <AppText
            style={[
              styles.statValue,
              isTablet && styles.statValueTablet,
              isTablet && activeTab === "allTasks" && styles.statValueActiveAll,
            ]}
          >
            {allPercentage}%
          </AppText>
        </TouchableOpacity>

        {/* Team MEP */}
        <TouchableOpacity
          style={[styles.statBox, isTablet && styles.statBoxTablet, isTablet && activeTab === "teamMep" && styles.statBoxActiveTeamMep]}
          onPress={() => (isTablet ? onTabSelect("teamMep") : router.push("/tasks/teamMep"))}
        >
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#00bb06" }, isTablet && styles.circleTablet]}>
              <Ionicons name="people-outline" size={14} color="#fff" />
            </View>
            <AppText style={[styles.statLabel, isTablet && styles.statLabelTablet, isTablet && activeTab === "teamMep" && styles.statLabelActiveTeamMep]}>Team MEP</AppText>
          </View>
          <AppText style={[styles.statValue, isTablet && styles.statValueTablet, isTablet && activeTab === "teamMep" && styles.statValueActiveTeamMep]}>{teamMepCount}</AppText>
        </TouchableOpacity>
      </View>

      {/* Rij 2, met "My MEP" (links) en "Out of stock" (rechts) */}
      <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
        {/* My MEP */}
        <TouchableOpacity
          style={[
            styles.statBox,
            isTablet && styles.statBoxTablet,
            isTablet && activeTab === "myMep" && styles.statBoxActiveMyMep,
          ]}
          onPress={() => (isTablet ? onTabSelect("myMep") : router.push("/tasks/myMep"))}
        >
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#ff9000" }, isTablet && styles.circleTablet]}>
              <Ionicons name="person-outline" size={14} color="#fff" />
            </View>
            <AppText
              style={[
                styles.statLabel,
                isTablet && styles.statLabelTablet,
                isTablet && activeTab === "myMep" && styles.statLabelActiveMyMep,
              ]}
            >
              My MEP
            </AppText>
          </View>
          <AppText
            style={[
              styles.statValue,
              isTablet && styles.statValueTablet,
              isTablet && activeTab === "myMep" && styles.statValueActiveMyMep,
            ]}
          >
            {myMepCount}
          </AppText>
        </TouchableOpacity>

        {/* Out of stock */}
        <TouchableOpacity
          style={[styles.statBox, isTablet && styles.statBoxTablet, isTablet && activeTab === "outOfStock" && styles.statBoxActiveOutOfStock]}
          onPress={() => (isTablet ? onTabSelect("outOfStock") : router.push("/tasks/outOfStock"))}
        >
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#FF6347" }, isTablet && styles.circleTablet]}>
              <Ionicons name="cart-outline" size={14} color="#fff" />
            </View>
            <AppText style={[styles.statLabel, isTablet && styles.statLabelTablet, isTablet && activeTab === "outOfStock" && styles.statLabelActiveOutOfStock]}>Out of stock</AppText>
          </View>
          {/* Toon aantal out of stock taken */}
          <AppText style={[styles.statValue, isTablet && styles.statValueTablet, isTablet && activeTab === "outOfStock" && styles.statValueActiveOutOfStock]}>{outOfStockCount}</AppText>
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

  // -- Tablet view --
  statsContainerTablet: {
    marginVertical: 32,
  },
  statsRowTablet: {
    marginBottom: 24,
  },
  statBoxTablet: {
    width: "48%",
    paddingVertical: 21,
    borderRadius: 18,
    borderWidth: 0.5,
  },

  circleTablet: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 12,
  },
  statLabelTablet: {
    fontSize: 18,
  },

  statValueTablet: {
    fontSize: 26,
  },

  // -- Active tab styling --
  statBoxActiveAll: {
    borderWidth: 2,
    borderColor: "#1068fa",
  },
  statLabelActiveAll: {
    color: "#1068fa",
  },
  statValueActiveAll: {
    color: "#1068fa",
  },

  statBoxActiveTeamMep: {
    borderWidth: 2,
    borderColor: "#5cbc26",
  },
  statLabelActiveTeamMep: {
    color: "#5cbc26",
  },
  statValueActiveTeamMep: {
    color: "#5cbc26",
  },

  statBoxActiveMyMep: {
    borderWidth: 2,
    borderColor: "#fb9000", 
  },
  statLabelActiveMyMep: {
    color: "#fb9000",
  },
  statValueActiveMyMep: {
    color: "#fb9000",
  },

  statBoxActiveOutOfStock: {
    borderWidth: 2,
    borderColor: "#f36146", // mooie groene tint, kies zelf wat je wilt
  },
  statLabelActiveOutOfStock: {
    color: "#f36146",
  },
  statValueActiveOutOfStock: {
    color: "#f36146",
  },
});
