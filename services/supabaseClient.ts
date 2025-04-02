import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://iagviigwuyvsdovpodxy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZ3ZpaWd3dXl2c2RvdnBvZHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwOTcyNTEsImV4cCI6MjA1NjY3MzI1MX0.k9lYHzJBLbuPpPQ8JwTrskPRri5ySMc1ji-pPniXpK8";

/* Create a custom storage adapter that handles both client and server environments */
const createStorageAdapter = () => {
  /* Check if running in a browser environment */
  const isClient = typeof window !== 'undefined';

  if (isClient) {
    /* We're on the client, use AsyncStorage */
    return AsyncStorage;
  }
  
  /* We're on the server, provide a dummy implementation
  that satisfies the interface but doesn't use window */
  return {
    getItem: (_key: string) => Promise.resolve(null),
    setItem: (_key: string, _value: string) => Promise.resolve(),
    removeItem: (_key: string) => Promise.resolve(),
  };
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
});