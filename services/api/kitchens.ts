import { supabase } from "../supabaseClient";
import type { PostgrestError } from "@supabase/supabase-js";

type CreateKitchenResult = {
  data: any;
  error: PostgrestError | null;
};

export async function createKitchen(owner_id: string, kitchenName: string): Promise<CreateKitchenResult> {
  const { data, error } = await supabase
    .from("kitchens")
    .insert([
      {
        owner_id,
        kitchen_name: kitchenName,
      },
    ])
    .select("id") /* Vraag de volledige representatie op */
    .maybeSingle(); /* Verwacht maximaal één record */

  return { data, error };
}
