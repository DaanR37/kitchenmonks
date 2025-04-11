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
    /* Probeer een bestaande instance op te halen */
    const { data, error } = await supabase
      .from("task_instances")
      .select("*")
      .eq("task_template_id", template.id)
      .eq("date", selectedDate)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    console.log("data", data);

    if (data) {
      /* Als er al een instance bestaat, voeg deze toe, en overschrijf eventueel de task_name uit de template */
      tasks.push({ ...data, task_name: template.task_name });
    } else {
      /* Als er geen instance bestaat, kun je er eentje aanmaken (of default gebruiken) */
      const newInstance = await createTaskInstance(template.id, selectedDate);
      tasks.push({ ...newInstance, task_name: template.task_name });
    }
  }
  return tasks;
}
