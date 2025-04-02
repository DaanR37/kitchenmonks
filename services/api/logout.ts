import { supabase } from "../supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function logoutUser() {
  await supabase.auth.signOut();
  await AsyncStorage.removeItem("activeProfileId");
};