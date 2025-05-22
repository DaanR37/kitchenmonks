import { supabase } from "../supabaseClient";
import { fetchTaskTemplatesBySection } from "./taskTemplates";
import { createTaskInstance } from "./taskInstances";
import { format, eachDayOfInterval } from "date-fns";
import { getSectionIdsForKitchen } from "./taskStats";

/*
  getTasksForSectionOnDate:
  - Doel: Voor een gegeven sectie (sectionId) en geselecteerde datum (selectedDate) zorgen we ervoor dat
          voor elke geldige task template er een corresponderende taakinstance is.
  - Werking:
      1. Haal alle task templates op voor de sectie die geldig zijn op de geselecteerde datum.
      2. Voor elke template:
         a. Probeer een bestaande task_instance op te halen met de combinatie (template.id, selectedDate).
         b. Als er een instance bestaat, voeg deze toe aan de lijst.
         c. Als er geen instance bestaat, maak er dan een aan via createTaskInstance en voeg deze toe.
      3. Retourneer de array van task_instances, waarbij we de task_name van de template toevoegen.
  - Deze helper centraliseert de logica zodat je componenten eenvoudiger de dag-specifieke taken kunnen ophalen.
*/
export async function getTasksForSectionOnDate(sectionId: string, selectedDate: string) {
  /* Haal alle geldige task templates op voor deze sectie en datum */
  const templates = await fetchTaskTemplatesBySection(sectionId, selectedDate);
  const tasks: any[] = [];

  /* Voor elke template, controleer of er al een task_instance bestaat voor de geselecteerde datum */
  for (const template of templates) {
    // 1. Check of de datum binnen de geldigheidsperiode valt
    const isInDateRange = selectedDate >= template.start_date && selectedDate <= template.end_date;
    if (!isInDateRange) continue;

    // 2. Zoek bestaande instance
    const { data, error } = await supabase
      .from("task_instances")
      .select("*")
      .eq("task_template_id", template.id)
      .eq("date", selectedDate)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      // 3. Bestaat al → push met taaknaam uit template
      tasks.push({ ...data, task_name: template.task_name });
    } /*else {
      // 4. Bestond nog niet → aanmaken en pushen
      const newInstance = await createTaskInstance(template.id, selectedDate);
      tasks.push({ ...newInstance, task_name: template.task_name });
    } */
  }
  return tasks;
}

/*
  fetchTaskTemplatesByKitchen:
  - Doel: Haal alle taaktemplates op van een keuken die geldig zijn op een bepaalde datum.
  - Parameters:
      kitchenId: Het ID van de keuken waarvan de taaktemplates afkomstig zijn.
      date: De datum waarop de taaktemplates geldig zijn.
*/
export async function fetchTaskTemplatesByKitchen(kitchenId: string) {
  const { data, error } = await supabase
    .from("task_templates")
    .select("*, section:section_id(kitchen_id)")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data.filter((t: any) => t.section?.kitchen_id === kitchenId);
}

/*
  backfillTaskInstances:
  - Doel: Voor elke taaktemplate die geldig is op een bepaalde datum, maak er een taakinstance aan.
  - Parameters:
      kitchenId: Het ID van de keuken waarvan de taaktemplates afkomstig zijn.
*/
export async function backfillTaskInstances(kitchenId: string) {
  const templates = await fetchTaskTemplatesByKitchen(kitchenId);

  for (const template of templates) {
    const start = new Date(template.start_date);
    const end = new Date(template.end_date);

    const days = eachDayOfInterval({ start, end });

    for (const day of days) {
      const date = format(day, "yyyy-MM-dd");

      const { count } = await supabase
        .from("task_instances")
        .select("id", { count: "exact", head: true })
        .eq("task_template_id", template.id)
        .eq("date", date);

      if (count === 0) {
        console.log(`⏳ Backfilling ${template.task_name} on ${date}`);
        await createTaskInstance(template.id, date);
      }
    }
  }

  console.log("✅ Backfill compleet");
}

/*
  fetchTaskInstancesWithSection:
  - Doel: Haal alle taakinstances op met de bijbehorende sectie.
  - Parameters:
      date: De datum waarop de taakinstances gelden.
      kitchenId: Het ID van de keuken waarvan de taakinstances afkomstig zijn.
*/
export async function fetchTaskInstancesWithSection(date: string, kitchenId: string) {
  try {
    const { data, error } = await supabase
      .from("task_instances")
      .select(
        `
        id,
        date,
        status,
        assigned_to,
        task_template:task_template_id!inner(
          task_name,
          section:section_id(id, section_name, start_date, end_date)
        )
      `
      )
      .eq("date", date);

    if (error) throw error;

    const sectionIds = await getSectionIdsForKitchen(kitchenId);
    return data.filter(
      (t: any) => t.task_template?.section?.id && sectionIds.includes(t.task_template.section.id)
    );
  } catch (err) {
    console.error("Error fetching all task_instances with section linkage:", err);
    return [];
  }
}

/*
  fetchTaskInstancesWithSectionForScreens:
  - Doel: Haal alle taakinstances op met de bijbehorende sectie voor de screens.
  - Parameters:
      kitchenId: Het ID van de keuken waarvan de taakinstances afkomstig zijn.
      date: De datum waarop de taakinstances gelden.
*/
export async function fetchTaskInstancesWithSectionForScreens(kitchenId: string, date: string) {
  const { data, error } = await supabase
    .from("task_instances")
    .select(
      `
      *,
      task_template:task_template_id!inner(
        task_name,
        section:section_id(id, section_name, start_date, end_date, kitchen_id)
      )
    `
    )
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data.filter((t: any) => t.task_template?.section?.kitchen_id === kitchenId);
}
