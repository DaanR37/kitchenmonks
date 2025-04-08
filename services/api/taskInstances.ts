import { supabase } from "@/services/supabaseClient";

/*
  createTaskInstance:
  - Doel: Maak een nieuwe taakinstance aan voor een specifieke taaktemplate op een bepaalde datum.
  - Parameters:
      taskTemplateId: Het ID van de taaktemplate waarvan je een instance wilt aanmaken.
      date: De datum waarop deze taakinstance geldt.
  - Belangrijk: De ingevoerde taskTemplateId moet overeenkomen met een bestaande rij in task_templates.
*/
export async function createTaskInstance(taskTemplateId: string, date: string) {
  const { data, error } = await supabase
    .from("task_instances")
    .insert([
      { 
        task_template_id: taskTemplateId, /* Koppeling met de taaktemplate */
        date: date /* De specifieke datum voor deze instance */
      }
    ])
    .select() /* Retourneer de ingevoegde rij (nieuwe taakinstance) */
    .maybeSingle(); /* Verwacht één enkele rij */

  if (error) throw error;
  return data;
}

/* Is onderstaande functie nog nodig? */
/*
  fetchTaskInstancesBySection:
  - Doel: Haal alle taakinstances op voor een bepaalde sectie (sectionId) en datum.
  - Werking:
      * We doen een nested select waarbij we via de foreign key (task_template_id) de gekoppelde task_template ophalen.
      * De notatie "task_template: task_template_id!task_instances_task_template_id_fkey(*)" 
        betekent dat we de kolom task_template_id gebruiken en de constraint-naam "task_instances_task_template_id_fkey"
        laten gebruiken om de relatie te vinden.
  - Belangrijk: Zorg dat de constraintnaam exact overeenkomt met de naam in Supabase.
*/
export async function fetchTaskInstancesBySection(sectionId: string, date: string) {
  /* Deze functie haalt alle task_instances op voor een bepaalde sectie en dag. 
  We joinen via task_template om te filteren op section_id. */
  const { data, error } = await supabase
    .from("task_instances")
    .select("*, task_template: task_template_id!task_instances_task_template_id_fkey(*)")
    .eq("date", date)
    /* Filter op de gekoppelde task_template die behoort tot de gewenste sectie */
    .eq("task_template.section_id", sectionId);

  if (error) throw error;
  return data;
}

/*
  updateTaskInstanceStatus:
  - Doel: Werk de status van een bestaande taakinstance bij.
  - Parameters:
      taskInstanceId: Het ID van de taakinstance die je wilt updaten.
      newStatus: De nieuwe status (bijv. "active", "in progress", "done").
*/
export async function updateTaskInstanceStatus(taskInstanceId: string, newStatus: string) {
  const { data, error } = await supabase
    .from("task_instances")
    .update({ status: newStatus })
    .eq("id", taskInstanceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/*
  assignTaskInstance:
  - Doel: Wijs een taakinstance toe aan een specifiek profiel.
  - Parameters:
      taskInstanceId: Het ID van de taakinstance.
      profileId: Het ID van het profiel (kan null zijn om te verwijderen).
*/
export async function assignTaskInstance(
  taskInstanceId: string,
  profileIds: string[] | null/* Geef een array mee als er meerdere profielen zijn */
) {
  const { data, error } = await supabase
    .from("task_instances")
    .update({ assigned_to: profileIds }) /* Update met de array direct */
    .eq("id", taskInstanceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}