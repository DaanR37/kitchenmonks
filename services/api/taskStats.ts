import { supabase } from "@/services/supabaseClient";

/**
 * Haal het percentage “done” op van alle taken in de hele keuken (ongeacht assigned_to).
 * We gaan er even vanuit dat “actief” gedefinieerd is als status in ["active", "in progress"].
 *
 * returnedPercentage = ( #done / (#done + #actief ) ) * 100
 */
export async function fetchAllDonePercentage(date: string): Promise<number> {
  try {
    /* 1) Tel taken met status = "done" of "in progress" */
    const { count: doneCount, error: doneError } = await supabase
      .from("task_instances")
      .select("id", { count: "exact", head: true })
      .eq("date", date)
      .in("status", ["done", "in progress"]); // ✅ beide tellen als voltooid

    if (doneError) throw doneError;

    /* 2) Tel totaal aantal actieve taken: "done", "in progress", "active" */
    const { count: totalCount, error: totalError } = await supabase
      .from("task_instances")
      .select("id", { count: "exact", head: true })
      .eq("date", date)
      .in("status", ["done", "in progress", "active"]);

    if (totalError) throw totalError;

    const done = doneCount ?? 0;
    const total = totalCount ?? 0;

    if (total === 0) return 0;

    const percentage = (done / total) * 100;
    return Math.round(percentage);
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
 * Haal het aantal active taken op voor een bepaalde keuken.
 */
export async function fetchActiveTasksCount(date: string): Promise<number> {
  const { count, error } = await supabase
    .from("task_instances")
    .select("id", { count: "exact", head: true })
    .in("status", ["active", "in progress"]) // ✅ meerdere statussen
    .eq("date", date);

  if (error) {
    console.error("Error fetching active tasks count:", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Haal het aantal task_instances op met status 'out of stock' voor een gegeven datum.
 */
export async function fetchOutOfStockTasksCount(date: string): Promise<number> {
  const { count, error } = await supabase
    .from("task_instances")
    .select("id", { count: "exact", head: true })
    .eq("status", "out of stock")
    .eq("date", date);

  if (error) {
    console.error("Error fetching out‑of‑stock count:", error);
    return 0;
  }
  return count ?? 0;
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
    .in("status", ["active", "in progress"]);

  if (error) throw error;

  const activeCounts: Record<string, number> = {};

  data.forEach((instance: any) => {
    const secId = instance.task_template?.section_id;
    if (secId) {
      if (!activeCounts[secId]) {
        activeCounts[secId] = 0;
      }
      activeCounts[secId] += 1;
    }
  });

  return activeCounts;
}
