import React from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AppText from "@/components/AppText";

export type StatsSectionProps = {
  allPercentage: number;
  teamMepCount: number;
  myMepCount: number;
  outOfStockCount: number;
  noStatusCount: number;
  hasMyMepData: boolean;
  hasTeamMepData: boolean;
  hasOutOfStockData: boolean;
  hasNoStatusData: boolean;
  hasAllData: boolean;
  isTablet: boolean;
  activeTab: string;
  onTabSelect: (tab: string) => void;
};

export default function StatsSection({
  allPercentage,
  teamMepCount,
  myMepCount,
  outOfStockCount,
  noStatusCount,
  hasMyMepData,
  hasTeamMepData,
  hasOutOfStockData,
  hasNoStatusData,
  hasAllData,
  isTablet,
  activeTab,
  onTabSelect,
}: StatsSectionProps) {
  const router = useRouter();

  /* Bereken per button of hij actief moet zijn */
  const isAllActive = hasAllData;
  const isTeamActive = hasTeamMepData;
  const isMyActive = hasMyMepData;
  const isOutOfStockActive = hasOutOfStockData;
  const isNoStatusActive = hasNoStatusData;

  return (
    <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
      {/* Rij 1: All (volledige breedte) */}
      <TouchableOpacity
        style={[
          styles.statBoxFullWidth,
          !isAllActive && { opacity: 0.7 },
          isTablet && activeTab === "allTasks" && styles.statBoxActiveAll,
        ]}
        disabled={!isAllActive}
        onPress={() => {
          if (!isAllActive) return;
          isTablet ? onTabSelect("allTasks") : router.push("/tasks/allTasks");
        }}
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

      {/* Rij 2: 2x2 grid met de overige knoppen */}
      <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
        {/* Team MEP */}
        <TouchableOpacity
          style={[
            styles.statBox,
            isTablet && styles.statBoxTablet,
            !isTeamActive && { opacity: 0.7 },
            isTablet && activeTab === "teamMep" && styles.statBoxActiveTeamMep,
          ]}
          disabled={!isTeamActive}
          onPress={() => {
            if (!isTeamActive) return;
            isTablet ? onTabSelect("teamMep") : router.push("/tasks/teamMep");
          }}
        >
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#00bb06" }, isTablet && styles.circleTablet]}>
              <Ionicons name="people-outline" size={14} color="#fff" />
            </View>
            <AppText
              style={[
                styles.statLabel,
                isTablet && styles.statLabelTablet,
                isTablet && activeTab === "teamMep" && styles.statLabelActiveTeamMep,
              ]}
            >
              Team MEP
            </AppText>
          </View>
          <AppText
            style={[
              styles.statValue,
              isTablet && styles.statValueTablet,
              isTablet && activeTab === "teamMep" && styles.statValueActiveTeamMep,
            ]}
          >
            {teamMepCount}
          </AppText>
        </TouchableOpacity>

        {/* My MEP */}
        <TouchableOpacity
          style={[
            styles.statBox,
            isTablet && styles.statBoxTablet,
            !isMyActive && { opacity: 0.7 },
            isTablet && activeTab === "myMep" && styles.statBoxActiveMyMep,
          ]}
          disabled={!isMyActive}
          onPress={() => {
            if (!isMyActive) return;
            isTablet ? onTabSelect("myMep") : router.push("/tasks/myMep");
          }}
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
      </View>

      {/* Rij 3: 2x2 grid met de overige knoppen */}
      <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
        {/* Out of stock */}
        <TouchableOpacity
          style={[
            styles.statBox,
            isTablet && styles.statBoxTablet,
            !isOutOfStockActive && { opacity: 0.7 },
            isTablet && activeTab === "outOfStock" && styles.statBoxActiveOutOfStock,
          ]}
          disabled={!isOutOfStockActive}
          onPress={() => (isTablet ? onTabSelect("outOfStock") : router.push("/tasks/outOfStock"))}
        >
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#FF6347" }, isTablet && styles.circleTablet]}>
              <Ionicons name="cart-outline" size={14} color="#fff" />
            </View>
            <AppText
              style={[
                styles.statLabel,
                isTablet && styles.statLabelTablet,
                isTablet && activeTab === "outOfStock" && styles.statLabelActiveOutOfStock,
              ]}
            >
              Out of stock
            </AppText>
          </View>
          {/* Toon aantal out of stock taken */}
          <AppText
            style={[
              styles.statValue,
              isTablet && styles.statValueTablet,
              isTablet && activeTab === "outOfStock" && styles.statValueActiveOutOfStock,
            ]}
          >
            {outOfStockCount}
          </AppText>
        </TouchableOpacity>

        {/* No status */}
        <TouchableOpacity
          style={[
            styles.statBoxNoStatus,
            isTablet && styles.statBoxTabletNoStatus,
            !isNoStatusActive && { opacity: 0.7 },
            isTablet && activeTab === "noStatus" && styles.statBoxActiveNoStatus,
          ]}
          disabled={!isNoStatusActive}
          onPress={() => {
            if (!isNoStatusActive) return;
            isTablet ? onTabSelect("noStatus") : router.push("/tasks/noStatus");
          }}
        >
          <View style={styles.statLeft}>
            <View
              style={[
                styles.circle,
                { backgroundColor: "#ececec" },
                isTablet && styles.circleTablet,
              ]}
            >
              <Ionicons name="help-outline" size={14} color="#000" />
            </View>
            <AppText
              style={[
                styles.statLabel,
                isTablet && styles.statLabelTablet,
                isTablet && activeTab === "noStatus" && styles.statLabelActiveNoStatus,
              ]}
            >
              No status
            </AppText>
          </View>
          <AppText
            style={[
              styles.statValue,
              isTablet && styles.statValueTablet,
              isTablet && activeTab === "noStatus" && styles.statValueActiveNoStatus,
            ]}
          >
            {noStatusCount}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    marginVertical: 18,
  },
  statBoxFullWidth: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.1)",
    backgroundColor: "#ffffff",
    paddingVertical: Platform.select({
      ios: 20,
      android: 14,
    }),
    paddingHorizontal: Platform.select({
      ios: 16,
      android: 12,
    }),
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "49%",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.1)",
    backgroundColor: "#ffffff",
    paddingVertical: Platform.select({
      ios: 20,
      android: 14,
    }),
    paddingHorizontal: Platform.select({
      ios: 16,
      android: 12,
    }),
  },
  statBoxNoStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "49%",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.1)",
    backgroundColor: "#f6f6f6",
    paddingVertical: Platform.select({
      ios: 20,
      android: 14,
    }),
    paddingHorizontal: Platform.select({
      ios: 16,
      android: 12,
    }),
  },
  statLeft: {
    flexDirection: "column",
  },
  circle: {
    marginBottom: 7,
    alignItems: "center",
    justifyContent: "center",
    width: Platform.select({
      ios: 34,
      android: 30,
    }),
    height: Platform.select({
      ios: 34,
      android: 30,
    }),
    borderRadius: Platform.select({
      ios: 17,
      android: 15,
    }),
  },
  statLabel: {
    marginTop: 2,
    marginBottom: 0,
    fontSize: 16,
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
  statBoxTabletNoStatus: {
    width: "48%",
    paddingVertical: 21,
    borderRadius: 18,
    borderWidth: 0.5,
    backgroundColor: "#f6f6f6",
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
    borderColor: "#f36146",
  },
  statLabelActiveOutOfStock: {
    color: "#f36146",
  },
  statValueActiveOutOfStock: {
    color: "#f36146",
  },

  statBoxActiveNoStatus: {
    borderWidth: 2,
    borderColor: "#a9a9a9", // grijs
  },
  statLabelActiveNoStatus: {
    color: "#a9a9a9",
  },
  statValueActiveNoStatus: {
    color: "#a9a9a9",
  },
});
