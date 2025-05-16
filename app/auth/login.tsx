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
import { Ionicons } from "@expo/vector-icons";

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
          {/* back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonCircle}>
              <Ionicons name="chevron-back" size={14} color="#333" />
            </View>
          </TouchableOpacity>

          {/* kitchenmonks logo */}
          <View style={styles.logoContainer}>
            <Image source={require("../../assets/images/KITCHENMONKSLOGOX.png")} style={styles.logo} />
            <AppText style={styles.title}>KITCHENMONKS</AppText>
            <AppText style={styles.subtitle}>Welcome back! Please log in to continue</AppText>
          </View>

          {/* Log-in form */}
          <View style={styles.buttonContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#666"
                autoCorrect={false}
              />
              <TextInput
                placeholder="wachtwoord"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholderTextColor="#666"
                autoCorrect={false}
              />
            </View>

            {/* Log-in button */}
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
    margin: 12,
    backgroundColor: "#f2f1f6",
  },

  /* back button */
  backButton: {
    position: "absolute",
    top: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Platform.select({
      ios: 24,
      android: 24,
    }),
    marginTop: Platform.select({
      ios: 75,
      android: 20,
    }),
  },
  backButtonCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0e0e0dc",
  },

  /* logo & subtitle */
  logoContainer: {
    position: "absolute",
    top: "25%",
    transform: [{ translateY: "-25%" }],
    left: 0,
    right: 0,
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 12,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "black",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    marginVertical: Platform.select({
      ios: 12,
      android: 16,
    }),
    marginHorizontal: Platform.select({
      ios: 60,
      android: 40,
    }),
  },

  /* input */
  inputContainer: {
    width: "80%",
  },
  input: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },

  /* buttons */
  buttonContainer: {
    position: "absolute",
    bottom: "5%",
    transform: [{ translateY: "5%" }],
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "#f2f1f6",
  },
  button: {
    width: "80%",
    padding: 16,
    marginTop: Platform.select({
      ios: 18,
      android: 16,
    }),
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
});
