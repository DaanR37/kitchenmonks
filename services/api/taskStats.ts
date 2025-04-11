import { supabase } from "@/services/supabaseClient";
import React from "react";
import { View, Text } from "react-native";

/**
 * Haal het percentage “done” op van alle taken in de hele keuken (ongeacht assigned_to).
 * We gaan er even vanuit dat “actief” gedefinieerd is als status in ["active", "in progress"].
 *
 * returnedPercentage = ( #done / (#done + #actief ) ) * 100
 */
export async function fetchAllDonePercentage(date: string): Promise<number> {
  try {
    /* 1) tel het aantal taken met status=“done” */
    const { count: doneCount, error: doneError } = await supabase
      .from("task_instances")
      .select("id", { count: "exact", head: true })
      .eq("date", date)
      .eq("status", "done");
    if (doneError) throw doneError;

    /* 2) tel het aantal taken met “actieve” status */
    const { count: activeCount, error: activeError } = await supabase
      .from("task_instances")
      .select("id", { count: "exact", head: true })
      .eq("date", date)
      .in("status", ["active", "in progress"]);
    if (activeError) throw activeError;

    /* Als doneCount of activeCount ongedefinieerd is, zet ze op 0 */
    const done = doneCount ?? 0;
    const active = activeCount ?? 0;

    /* voorkomen dat we delen door 0 */
    if (done + active === 0) {
      return 0;
    }

    /* bereken het percentage */
    const percentage = (done / (done + active)) * 100;
    return Math.round(percentage); /* afronden als integer, of laat het als float */
  } catch (error) {
    console.error("Error fetching all done percentage:", error);
    return 0;
  }
}

/**
 * Haal het aantal taken op dat is toegewezen aan een specifiek profiel (activeProfile) voor een bepaalde datum.
 * We zoeken naar taakinstances waarin 'assigned_to' de profileId bevat.
 */
export async function fetchMyTasksCount(profileId: string, date: string): Promise<number> {
  const { data, count, error } = await supabase
    .from("task_instances")
    /* Vraag alleen het aantal op, zonder alle data op te halen */
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .contains("assigned_to", [profileId])
    .eq("date", date);
  if (error) {
    console.error("Error fetching my tasks count:", error);
    return 0;
  }
  return count || 0;
}

/**
 * Haal het aantal inactive taken op voor een bepaalde keuken.
 */
export async function fetchInactiveTasksCount(date: string): Promise<number> {
  const { data, count, error } = await supabase
    .from("task_instances")
    /* Gebruik head:true en count:"exact" om alleen het aantal rijen terug te krijgen */
    .select("id", { count: "exact", head: true })
    .eq("status", "inactive")
    .eq("date", date);

  if (error) {
    console.error("Error fetching inactive tasks count:", error);
    return 0;
  }
  return count || 0;
}

/**
 * Haal per sectie (binnen de gegeven kitchenId en de geselecteerde date)
 * het aantal 'active' taken op. We zoeken in task_instances die status==='active',
 * en joinen via task_template → sections om de sectie_id te herkennen.
 */
export async function fetchActiveCountPerSection(
  kitchenId: string,
  date: string
): Promise<Record<string, number>> {
  // We selecteren de data en includen de task_template-relatie
  // om erachter te komen bij welke sectie deze instance hoort.
  const { data, error } = await supabase
    .from("task_instances")
    .select(
      `
      status,
      task_template:task_template_id(
        section_id
      )
    `
    )
    .eq("date", date)
    .eq("status", "active");

  if (error) throw error;

  // `data` is een array van objects. Elk object heeft ongeveer:
  // {
  //   status: 'active',
  //   task_template: { section_id: '...' }
  // }
  // We gaan alles groeperen op section_id en tellen de 'active' instances.
  const activeCounts: Record<string, number> = {};

  data.forEach((instance: any) => {
    const secId = instance.task_template.section_id;
    if (!activeCounts[secId]) {
      activeCounts[secId] = 0;
    }
    activeCounts[secId] += 1;
  });
  console.log("activeCounts", activeCounts);
  return activeCounts;
}
