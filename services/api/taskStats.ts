import { supabase } from "@/services/supabaseClient";
import React from "react";
import { View, Text } from "react-native";

/**
 * Haal het percentage van alle taken op. Dit is een voorbeeld;
 * je kunt hier een berekening doen op basis van aantal actieve vs. totaal aantal taken.
 */
export async function fetchAllTasksPercentage(kitchenId: string): Promise<number> {
  // Voorbeeld: stel dat we een statisch percentage geven (pas dit aan volgens jouw logica)
  return 49;
}

/**
 * Haal het aantal taken op dat is toegewezen aan een specifiek profiel (activeProfile).
 * We zoeken naar taakinstances waarin 'assigned_to' de profileId bevat.
 */
export async function fetchMyTasksCount(profileId: string): Promise<number> {
  const { data, count, error } = await supabase
    .from("task_instances")
    /* Gebruik head: true als je alleen count wilt, maar lees dan het count veld */
    .select("*", { head: true, count: "exact"  })
    .contains("assigned_to", [profileId]);
  if (error) throw error;
  /* Let op: Als data niet direct beschikbaar is als count, kijk dan naar de count-waarde in de response. */
  return count || 0; /* Gebruik count in plaats van data.length */
}

/**
 * Haal het aantal inactive taken op voor een bepaalde keuken.
 */
// export async function fetchInactiveTasksCount(kitchenId: string): Promise<number> {
//   const { data, error } = await supabase
//     .from("task_instances")
//     .select("*", { count: "exact", head: true })
//     .eq("status", "inactive")
//     .eq("kitchen_id", kitchenId);
//   if (error) throw error;
//   return (data as any)?.length || 0;
// }
