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
        task_template_id: taskTemplateId /* Koppeling met de taaktemplate */,
        date: date /* De specifieke datum voor deze instance */,
        // deleted: false,
      },
    ])
    .select() /* Retourneer de ingevoegde rij (nieuwe taakinstance) */
    .maybeSingle(); /* Verwacht één enkele rij */

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
  deleteTaskInstance:
  - Doel: Verwijder een bestaande taakinstance.
  - Parameters:
      taskInstanceId: Het ID van de taakinstance die je wilt verwijderen.
*/
export async function deleteTaskInstance(taskInstanceId: string) {
  const { error } = await supabase.from("task_instances").delete().eq("id", taskInstanceId);

  if (error) throw error;
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
  profileIds: string[] | null /* Geef een array mee als er meerdere profielen zijn */
) {
  const { data, error } = await supabase
    .from("task_instances")
    .update({ assigned_to: profileIds }) /* Update met de array direct */
    .eq("id", taskInstanceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Zet de taak op "in progress" en vul started_at in met huidige timestamp.
 */
export async function updateTaskInstanceInProgress(taskInstanceId: string) {
  const { data, error } = await supabase
    .from("task_instances")
    .update({
      status: "in progress",
      started_at: new Date().toISOString(),
      // Probeer te voorkomen dat finished_at hier per ongeluk
      // gevuld wordt, dus die laten we weg of nullen we juist
      // if you want to reset it: finished_at: null,
    })
    .eq("id", taskInstanceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Zet de taak op "done" en vul finished_at in met huidige timestamp.
 */
export async function updateTaskInstanceDone(taskInstanceId: string) {
  const { data, error } = await supabase
    .from("task_instances")
    .update({
      status: "done",
      finished_at: new Date().toISOString(),
    })
    .eq("id", taskInstanceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateTaskInstanceSkip(taskInstanceId: string) {
  const { data, error } = await supabase
    .from("task_instances")
    .update({
      status: "skip",
      // finished_at: new Date().toISOString(), // of laat weg als niet nodig
    })
    .eq("id", taskInstanceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
