import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function StatsSection() {
  const router = useRouter();

  return (
    <View style={styles.statsContainer}>
      {/* Container voor "All" */}
      <View style={styles.allContainer}>
        <View style={styles.statLeft}>
          <View style={[styles.circle, { backgroundColor: "#0066ff" }]} />
          <Text style={styles.allTitle}>All</Text>
        </View>
        <Text style={styles.allPercentage}>49%</Text>
      </View>

      {/* Containers voor "Open tasks" & "Voltooid" */}
      <View style={styles.statsRow}>
        {/* My tasks */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/myTasks")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#ff9000" }]} />
            <Text style={styles.statLabel}>My tasks</Text>
          </View>
          <Text style={styles.statValue}>9</Text>
        </TouchableOpacity>

        {/* Inactive */}
        <TouchableOpacity style={styles.statBox} onPress={() => router.push("/tasks/inactive")}>
          <View style={styles.statLeft}>
            <View style={[styles.circle, { backgroundColor: "#00bb06" }]} />
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
          <Text style={styles.statValue}>96</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    marginVertical: 16,
  },
  allContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  statLeft: {
    flexDirection: "column",
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
  },
  allTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  allPercentage: {
    fontSize: 26,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    // flex: 1,
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "700",
  },
});
