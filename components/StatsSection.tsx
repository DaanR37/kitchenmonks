import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/services/AuthContext";
import { ProfileContext } from "@/services/ProfileContext";
import { DateContext } from "@/services/DateContext";
import { supabase } from "@/services/supabaseClient";
import {
  fetchMyTasksCount,
  // fetchAllTasksPercentage,
  // fetchInactiveTasksCount,
} from "@/services/api/taskStats";

export default function StatsSection() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { activeProfile } = useContext(ProfileContext);
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [allPercentage, setAllPercentage] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  /* Laad de statistieken */
  async function loadStats() {
    if (!user || !activeProfile) return;
    try {
      const myCount = await fetchMyTasksCount(activeProfile.id);
      setMyTasksCount(myCount);
      // const allStat = await fetchAllTasksPercentage(user.user_metadata.kitchen_id);
      // const inactive = await fetchInactiveTasksCount(user.user_metadata.kitchen_id);
      // setAllPercentage(allStat);
      // setInactiveCount(inactive);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  /* Real-time subscription: luister naar veranderingen in de task_instances tabel */
  useEffect(() => {
    if (!user || !activeProfile) return;

    /* Maak een channel aan voor realtime updates op de "task_instances" tabel */
    const channel = supabase
      .channel("taskInstancesChannel")
      .on(
        "postgres_changes" /* Luister naar alle postgres veranderingen */,
        {
          event: "*", // Alle events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "task_instances", // De tabel waarop je wilt abonneren
        },
        (payload: any) => {
          /* Dit is je callback wanneer er een verandering plaatsvindt */
          console.log("Realtime update:", payload);
          /* Roep loadStats functie aan zodat statistieken direct worden bijgewerkt */
          loadStats();
        }
      )
      .subscribe();

    /* Cleanup: zorg dat de channel wordt opgeruimd bij unmount */
    return () => {
      channel.unsubscribe();
    };
  }, [user, activeProfile]);

  return (
    <View style={styles.statsContainer}>
      {/* Statistiek: All */}
      <View style={styles.allContainer}>
        <View style={styles.statLeft}>
          <View style={[styles.circle, { backgroundColor: "#0066ff" }]} />
          <Text style={styles.allTitle}>All</Text>
        </View>
        <Text style={styles.allPercentage}>49%</Text>
        {/* <Text style={styles.allPercentage}>{allPercentage}%</Text> */}
      </View>

      {/* Statistieken: My tasks en Inactive */}
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
          <Text style={styles.statValue}>{inactiveCount}</Text>
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
