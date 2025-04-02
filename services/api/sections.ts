import { supabase } from "@/services/supabaseClient";

/*
  fetchSections: Haalt alle secties op voor een bepaalde keuken (kitchenId).
  - De query haalt ook de gerelateerde task_templates op via een nested select.
  - De nested select gebruikt de foreign key constraint "task_templates_section_id_fkey".
  - Je zou hier eventueel de filtering op datum kunnen toevoegen (door .lte en .gte te gebruiken),
    maar in dit voorbeeld is dat commentaar (omdat de secties in principe de vaste menukaart zijn).
*/
export async function fetchSections(kitchenId: string /* date: string */) {
  const { data, error } = await supabase
    .from("sections")
    .select("*, task_templates: task_templates!task_templates_section_id_fkey(*)")
    .eq("kitchen_id", kitchenId);
  /* Optioneel: Filter secties op datum, zodat alleen secties getoond worden waarbij de geselecteerde datum 
    tussen start_date en end_date valt */
  // .lte("start_date", date)
  // .gte("end_date", date);

  if (error) throw error;
  return data;
}

/*
  createSection: Maakt een nieuwe sectie aan voor een keuken.
  - Vereist de kitchenId, de naam van de sectie, en een start- en einddatum.
  - Deze start_date en end_date bepalen de geldigheidsperiode waarin de sectie (menukaart) geldig is.
  - Na de insert wordt de nieuwe sectie teruggegeven als een enkel object (via .maybeSingle()).
*/
export async function createSection(
  kitchenId: string, 
  name: string, 
  startDate: string, 
  endDate: string
) {
  const { data, error } = await supabase
    .from("sections")
    .insert([
      { 
        kitchen_id: kitchenId, 
        section_name: name, 
        start_date: startDate, 
        end_date: endDate 
      }
    ])
    .select() /* Retourneert de ingevoegde rij */
    .maybeSingle(); /* Verwacht dat er één rij terugkomt */

  if (error) throw error;
  return data;
}
