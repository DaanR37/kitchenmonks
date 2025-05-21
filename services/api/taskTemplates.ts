import { supabase } from "@/services/supabaseClient";
import { eachDayOfInterval, format } from "date-fns";
import { createTaskInstance } from "./taskInstances";

/*
  createTaskTemplate:
  - Doel: Insert een nieuwe taaktemplate in de task_templates-tabel.
  - Parameters:
      sectionId: Het ID van de sectie waaraan deze template gekoppeld is.
      taskName: De naam van de taak (bijv. "Toast snijden").
      startDate: De datum vanaf wanneer deze template geldig is.
      endDate: De datum tot wanneer deze template geldig is.
  - Belangrijk: Zorg ervoor dat de kolomnaam voor de einddatum exact overeenkomt met de database (dus "end_date").
*/
// export async function createTaskTemplate(
//   sectionId: string,
//   taskName: string,
//   startDate: string,
//   endDate: string
// ) {
//   const { data, error } = await supabase
//     .from("task_templates")
//     .insert([
//       { 
//         section_id: sectionId, 
//         task_name: taskName, 
//         start_date: startDate, 
//         end_date: endDate 
//       }
//     ])
//     .select() /* Retourneer de ingevoegde rij */
//     .maybeSingle(); /* Verwacht één enkele rij */

//   if (error) throw error;
//   return data;
// }

export async function createTaskTemplate(
  sectionId: string,
  taskName: string,
  startDate: string,
  endDate: string
) {
  const { data: template, error } = await supabase
    .from("task_templates")
    .insert([
      { 
        section_id: sectionId, 
        task_name: taskName, 
        start_date: startDate, 
        end_date: endDate 
      }
    ])
    .select()
    .maybeSingle();

  if (error) throw error;

  // 🔁 Backfill alle dagen in range
  const allDates = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(endDate),
  });

  for (const day of allDates) {
    const date = format(day, "yyyy-MM-dd");

    const { count } = await supabase
      .from("task_instances")
      .select("id", { count: "exact", head: true })
      .eq("task_template_id", template.id)
      .eq("date", date);

    if (count === 0) {
      await createTaskInstance(template.id, date);
    }
  }

  return template;
}

/*
  updateTaskTemplateName:
  - Doel: Werk de naam van een bestaande taaktemplate bij.
  - Parameters:
      taskTemplateId: Het ID van de taaktemplate die je wilt bijwerken.
      newName: De nieuwe naam voor de taaktemplate.
*/
export async function updateTaskTemplateName(taskTemplateId: string, newName: string) {
  const { data, error } = await supabase
    .from("task_templates")
    .update({ task_name: newName })
    .eq("id", taskTemplateId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/*
  fetchTaskTemplatesBySection:
  - Doel: Haal alle taaktemplates op voor een bepaalde sectie (sectionId) die geldig zijn op de geselecteerde datum.
  - De filtering wordt gedaan door te controleren of:
      start_date <= selectedDate <= end_date.
  - Retourneert: Een array met taaktemplates die aan deze criteria voldoen.
*/
export async function fetchTaskTemplatesBySection(
  sectionId: string, 
  selectedDate: string
) {
  const { data, error } = await supabase
    .from("task_templates")
    .select("*") /* Haal alle kolommen op */
    .eq("section_id", sectionId) /* Filter op de sectie */
    .lte("start_date", selectedDate) /* Zorg dat de start_date vóór of gelijk aan de geselecteerde datum is */
    .gte("end_date", selectedDate); /* Zorg dat de end_date na of gelijk aan de geselecteerde datum is */

  if (error) throw error;
  return data;
}
