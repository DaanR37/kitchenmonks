import { supabase } from "../supabaseClient";
import { fetchTaskTemplatesBySection } from "./taskTemplates";
import { createTaskInstance } from "./taskInstances";

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

/* Haal alle templates op van een keuken die geldig zijn op een bepaalde datum */
// export async function fetchTaskTemplatesByKitchen(kitchenId: string, date?: string) {
//   const { data, error } = await supabase
//     .from("task_templates")
//     // .select("*, section:section_id(kitchen_id)")
//     .select("*, section:section_id(id, kitchen_id)")
//     .lte("start_date", date)
//     .gte("end_date", date)

//   if (error) throw error;

//   // return data.filter((t: { section?: { kitchen_id: string } }) => t.section?.kitchen_id === kitchenId);
//   return data.filter((t: any) => t.section?.kitchen_id === kitchenId);
// }

// export async function backfillTaskInstances(kitchenId: string) {
//   const templates = await fetchTaskTemplatesByKitchen(kitchenId);

//   for (const template of templates) {
//     const days = eachDayOfInterval({
//       start: new Date(template.start_date),
//       end: new Date(template.end_date),
//     });

//     for (const day of days) {
//       const date = format(day, "yyyy-MM-dd");

//       const { count } = await supabase
//         .from("task_instances")
//         .select("id", { count: "exact", head: true })
//         .eq("task_template_id", template.id)
//         .eq("date", date);

//       if (count === 0) {
//         await createTaskInstance(template.id, date);
//       }
//     }
//   }
// }