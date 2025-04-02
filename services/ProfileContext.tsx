import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProfileData = {
  id: string;
  first_name: string;
  last_name: string;
  thumbnail_color?: string;
};

type ProfileContextType = {
  activeProfile: ProfileData | null;
  setActiveProfile: (profile: ProfileData | null) => void;
};

export const ProfileContext = createContext<ProfileContextType>({
  activeProfile: null,
  setActiveProfile: () => {},
});

type ProfileProviderProps = {
  children: ReactNode;
};

export function ProfileProvider({ children }: ProfileProviderProps) {
  // const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [activeProfile, setActiveProfileState] = useState<ProfileData | null>(null);

  /* Bij eerste mount: haal de profielID uit AsyncStorage */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem("activeProfile");
        if (storedProfile) {
          // parse de JSON string terug naar een object
          const parsedProfile: ProfileData = JSON.parse(storedProfile);
          setActiveProfileState(parsedProfile);
          console.log("Active profile loaded from AsyncStorage:", parsedProfile);
        }
      } catch (error) {
        console.log("Error loading activeProfile:", error);
      }
    };
    loadProfile();
  }, []);

  /* Telkens als activeProfile verandert, sla op in AsyncStorage */
  useEffect(() => {
    const saveProfile = async () => {
      try {
        if (activeProfile) {
          // stringify het object naar JSON
          await AsyncStorage.setItem("activeProfile", JSON.stringify(activeProfile));
        } else {
          await AsyncStorage.removeItem("activeProfile");
        }
      } catch (error) {
        console.log("Error saving activeProfile:", error);
      }
    };
    saveProfile();
  }, [activeProfile]);

  /* Functie om de activeProfile state te veranderen  */
  function setActiveProfile(profile: ProfileData | null) {
    setActiveProfileState(profile);
  }

  return (
    <ProfileContext.Provider value={{ activeProfile, setActiveProfile }}>{children}</ProfileContext.Provider>
  );
}
