import React, { createContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* Definieer welke data je in je context wilt delen */
type AuthContextType = {
  user: User | null | undefined;
  loading: boolean;
};

/* Maak de context aan met een default value */
export const AuthContext = createContext<AuthContextType>({
  user: undefined,
  loading: true,
});

/* Type voor de props van je provider, zodat TS weet wat 'children' is */
type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        /* Controleer of er een geldige sessie bestaat */
        console.log("[AuthContext] Checking existing session...");
        const { data, error } = await supabase.auth.getSession();
        // console.log("data", data);
        // console.log("error", error);
        if (error || !data.session) {
          console.log("Geen geldige sessie gevonden, forceren uitloggen");
          // Als er geen sessie is, log uit en maak AsyncStorage leeg
          await supabase.auth.signOut();
          await AsyncStorage.clear();
          setUser(null);
        } else {
          setUser(data.session.user);
        }
      } catch (err) {
        console.log("Fout bij het controleren van de sessie:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    // Luister naar latere auth-wijzigingen (bijv. in- en uitloggen)
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
