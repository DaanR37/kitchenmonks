import { supabase } from "../supabaseClient";

/* Haal alle profielen op voor een bepaalde keuken */
export async function fetchProfiles(kitchen_id: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("kitchen_id", kitchen_id);

  if (error) throw error;
  return data;
}

/* Maak een nieuw profiel aan */
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

/* Bewerk (update) een profiel */
export async function updateProfile(profileId: string, firstName: string, lastName: string) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
    })
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* Verwijder een profiel */
export async function deleteProfile(profileId: string) {
  const { error } = await supabase.from("profiles").delete().eq("id", profileId);

  if (error) throw error;
  return true;
}
