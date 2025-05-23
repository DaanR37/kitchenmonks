import { supabase } from "@/services/supabaseClient";

/*
  fetchAllDonePercentage:
  - Doel: Bereken het percentage van alle taakinstances dat 'done' of 'in progress' is.
  - Parameters:
      date: De datum waarop de taakinstances gelden.
      kitchenId: Het ID van de keuken waarvan de taakinstances afkomstig zijn.
*/
export async function fetchAllDonePercentage(date: string, kitchenId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("task_instances")
      .select(
        `
        id,
        status,
        task_template:task_template_id!inner(
          section_id
        )
      `
      )
      .eq("date", date)
      .in("status", ["done", "in progress", "active"]);

    if (error) throw error;

    const filtered = data.filter(
      (t: any) => t.task_template?.section_id && t.task_template.section_id !== null
    );
    const sectionIds = await getSectionIdsForKitchen(kitchenId);
    const kitchenTasks = filtered.filter((t: any) => sectionIds.includes(t.task_template.section_id));

    const done = kitchenTasks.filter((t: any) => t.status === "done" || t.status === "in progress").length;
    const total = kitchenTasks.length;

    return total === 0 ? 0 : Math.round((done / total) * 100);
  } catch (err) {
    console.error("Error fetching all done percentage:", err);
    return 0;
  }
}

/*
  fetchMyTasksCount:
  - Doel: Bereken het aantal taakinstances dat aan een bepaald profiel is toegewezen.
  - Parameters:
      profileId: Het ID van het profiel waarvan de taakinstances afkomstig zijn.
      date: De datum waarop de taakinstances gelden.
      kitchenId: Het ID van de keuken waarvan de taakinstances afkomstig zijn.
*/
export async function fetchMyTasksCount(profileId: string, date: string, kitchenId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("task_instances")
      .select(
        `
        id,
        status,
        assigned_to,
        task_template:task_template_id!inner(
          section_id
        )
      `
      )
      .eq("date", date)
      .contains("assigned_to", [profileId])
      .in("status", ["active", "in progress"]);

    if (error) throw error;

    const sectionIds = await getSectionIdsForKitchen(kitchenId);
    const kitchenTasks = data.filter((t: any) => sectionIds.includes(t.task_template.section_id));
    return kitchenTasks.length;
  } catch (err) {
    console.error("Error fetching my tasks count:", err);
    return 0;
  }
}

/*
  fetchActiveTasksCount:
  - Doel: Bereken het aantal taakinstances dat 'active' of 'in progress' is.
  - Parameters:
      date: De datum waarop de taakinstances gelden.
      kitchenId: Het ID van de keuken waarvan de taakinstances afkomstig zijn.
*/
export async function fetchActiveTasksCount(date: string, kitchenId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("task_instances")
      .select(
        `
        id,
        status,
        task_template:task_template_id!inner(
          section_id
        )
      `
      )
      .eq("date", date)
      .in("status", ["active", "in progress"]);

    if (error) throw error;

    const sectionIds = await getSectionIdsForKitchen(kitchenId);
    const kitchenTasks = data.filter((t: any) => sectionIds.includes(t.task_template.section_id));
    return kitchenTasks.length;
  } catch (err) {
    console.error("Error fetching active tasks count:", err);
    return 0;
  }
}

/*
  fetchOutOfStockTasksCount:
  - Doel: Bereken het aantal taakinstances dat 'out of stock' is.
  - Parameters:
      date: De datum waarop de taakinstances gelden.
      kitchenId: Het ID van de keuken waarvan de taakinstances afkomstig zijn.
*/
export async function fetchOutOfStockTasksCount(date: string, kitchenId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("task_instances")
      .select(
        `
        id,
        status,
        task_template:task_template_id!inner(
          section_id
        )
      `
      )
      .eq("date", date)
      .eq("status", "out of stock");

    if (error) throw error;

    const sectionIds = await getSectionIdsForKitchen(kitchenId);
    const kitchenTasks = data.filter((t: any) => sectionIds.includes(t.task_template.section_id));
    return kitchenTasks.length;
  } catch (err) {
    console.error("Error fetching out‑of‑stock count:", err);
    return 0;
  }
}

/*
  fetchNoStatusTasksCount:
  - Doel: Bereken het aantal taakinstances dat 'inactive' is.
  - Parameters:
      date: De datum waarop de taakinstances gelden.
      kitchenId: Het ID van de keuken waarvan de taakinstances afkomstig zijn.
*/
export async function fetchNoStatusTasksCount(date: string, kitchenId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("task_instances")
      .select(
        `
        id,
        status,
        task_template:task_template_id!inner(
          section_id
        )
      `
      )
      .eq("date", date)
      .eq("status", "inactive");

    if (error) throw error;

    const sectionIds = await getSectionIdsForKitchen(kitchenId);
    const kitchenTasks = data.filter((t: any) => sectionIds.includes(t.task_template.section_id));
    return kitchenTasks.length;
  } catch (err) {
    console.error("Error fetching no‑status count:", err);
    return 0;
  }
}

/*
  fetchActiveCountPerSection:
  - Doel: Bereken het aantal taakinstances per sectie dat 'active' of 'in progress' is.
  - Parameters:
      kitchenId: Het ID van de keuken waarvan de taakinstances afkomstig zijn.
      date: De datum waarop de taakinstances gelden.
*/
export async function fetchActiveCountPerSection(
  kitchenId: string,
  date: string
): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from("task_instances")
      .select(
        `
        id,
        status,
        task_template:task_template_id!inner(
          section_id
        )
      `
      )
      .eq("date", date)
      .in("status", ["active", "in progress"]);

    if (error) throw error;

    const sectionIds = await getSectionIdsForKitchen(kitchenId);
    const kitchenTasks = data.filter((t: any) => sectionIds.includes(t.task_template.section_id));

    const counts: Record<string, number> = {};
    kitchenTasks.forEach((instance: any) => {
      const secId = instance.task_template.section_id;
      if (!counts[secId]) counts[secId] = 0;
      counts[secId] += 1;
    });

    return counts;
  } catch (err) {
    console.error("Error fetching active count per section:", err);
    return {};
  }
}

/*
  getSectionIdsForKitchen:
  - Doel: Haal alle sectie-IDs op van een keuken.
  - Parameters:
      kitchenId: Het ID van de keuken waarvan de sectie-IDs afkomstig zijn.
*/
export async function getSectionIdsForKitchen(kitchenId: string): Promise<string[]> {
  const { data, error } = await supabase.from("sections").select("id").eq("kitchen_id", kitchenId);

  if (error) {
    console.error("Error fetching section ids for kitchen:", error);
    return [];
  }

  return data.map((s: any) => s.id);
}
