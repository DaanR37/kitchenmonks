import { supabase } from "../supabaseClient";

export async function fetchProfiles(kitchen_id: string) {
  /* Haal alle profielen op voor een bepaalde keuken */
  const { data, error } = await supabase.from("profiles").select("*").eq("kitchen_id", kitchen_id);

  if (error) throw error;
  return data;
}

export async function createProfile(kitchen_id: string, firstName: string, lastName: string) {
  const { data, error } = await supabase
    .from("profiles")
    .insert([
      {
        kitchen_id,
        first_name: firstName || "DefaultFirstName",
        last_name: lastName || "DefaultLastName",
        // profile_name: `${firstName} ${lastName}`,
      },
    ])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}
