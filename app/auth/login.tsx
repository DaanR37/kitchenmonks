import React, { useState, useContext } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { supabase } from "@/services/supabaseClient";
import { useRouter } from "expo-router";
import { createKitchen } from "@/services/api/kitchens";
import { ProfileContext } from "@/services/ProfileContext";
import AppText from "@/components/AppText";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setActiveProfile } = useContext(ProfileContext);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      return;
    }

    /* user is ingelogd, check of hij verified is */
    const user = data?.user;
    if (!user) {
      alert("Er ging iets mis bij het inloggen, probeer opnieuw");
      return;
    }
    console.log("User:", user);

    /* Check of er al een kitchens-record is */
    const { data: kitchensData, error: kitchensError } = await supabase
      .from("kitchens")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (kitchensError) {
      /* RLS/constraint error */
      alert(kitchensError.message);
      return;
    }

    if (!kitchensData) {
      /* Geen kitchen-record: maak er één aan en update user_metadata */
      const userKitchenName = user.user_metadata?.kitchenName || "Default Kitchen Name";
      const { data: newKitchen, error: newKitchenError } = await createKitchen(user.id, userKitchenName);
      if (newKitchenError) {
        alert(newKitchenError.message);
        return;
      }
      console.log("Kitchen created:", newKitchen);

      /* Update user_metadata met de nieuwe kitchen_id */
      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
        data: {
          kitchen_id: newKitchen.id /* Sla hier de id van de zojuist gemaakte kitchen op */,
        },
      });
      if (updateError) {
        console.log("Fout bij updaten user_metadata:", updateError.message);
      } else {
        /* Forceer een sessie-refresh door getUser opnieuw aan te roepen: */
        const { data: refreshedUser } = await supabase.auth.getUser();
        console.log("Updated user metadata:", refreshedUser?.user?.user_metadata);
      }
    } else {
      /* Als er al een kitchen-record is, maar user_metadata ontbreekt */
      if (!user.user_metadata?.kitchen_id) {
        const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
          data: { kitchen_id: kitchensData.id },
        });
        if (updateError) {
          console.log("Fout bij updaten user_metadata:", updateError.message);
        } else {
          const { data: refreshedUser } = await supabase.auth.getUser();
          console.log("Updated user metadata:", refreshedUser?.user?.user_metadata);
        }
      }
    }

    /* Reset actief profiel zodat de gebruiker een profielkeuze te zien krijgt */
    setActiveProfile(null);
    router.replace("/profiles");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={styles.container}>
          {/* Logo KM hier */}
          <View style={styles.logoContainer}>
            <Image source={require("../../assets/images/KITCHENMONKSLOGOX.png")} style={styles.logo} />
            <AppText style={styles.title}>KITCHENMONKS</AppText>
          </View>

          <View style={styles.buttonContainer}>
            <AppText style={styles.subtitle}>Welcome to KitchenMonks - Let's create your account</AppText>
            <View style={styles.inputContainer}>
              <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
              <TextInput
                placeholder="wachtwoord"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <AppText style={styles.buttonText}>Log in</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "space-around",
    backgroundColor: "#f2f1f6",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    // marginBottom: 12,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 12,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    color: "black",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 24,
    textAlign: "center",
    marginTop: 12,
    marginHorizontal: 24,
  },
  buttonContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    width: "80%",
  },
  input: {
    backgroundColor: "#fff",
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  button: {
    width: "80%",
    padding: 16,
    marginVertical: 8,
    borderRadius: 50,
    alignItems: "center",
    backgroundColor: "#000",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    alignSelf: "center",
  },
  backText: {
    marginTop: 16,
    color: "#999",
    fontSize: 14,
  },
});
