import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { supabase } from "@/services/supabaseClient";
import { useRouter } from "expo-router";
import AppText from "@/components/AppText";
import { Ionicons } from "@expo/vector-icons";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [kitchenName, setKitchenName] = useState("");
  const [name, setName] = useState("");

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      alert("Wachtwoorden komen niet overeen");
      return;
    }

    /* Maak alleen de user aan via Supabase Auth */
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        /* Je kunt user_metadata opslaan als je wilt (bijv. name) */
        data: {
          name,
          kitchenName,
          /* Hier kun je 'kitchenName' meegeven als metadata, maar je */
          /* maakt pas echt een kitchens-record aan na verificatie en login */
        },
        // emailRedirectTo: 'https://jouw-domein.nl/verified.html', // of een deep link voor je app
      },
    });

    if (error) {
      alert(error.message);
      return;
    } else {
      alert("Check je email en klik op de link om je account te activeren");
      router.replace("/auth/login");
    }
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
            <AppText style={styles.subtitle}>Welcome to KitchenMonks - Let's sign you up!</AppText>
          </View>

          {/* signup form */}
          <View style={styles.buttonContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholderTextColor="#666"
              />
              <TextInput
                placeholder="Wachtwoord"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholderTextColor="#666"
              />
              <TextInput
                placeholder="Herhaal wachtwoord"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
                placeholderTextColor="#666"
              />
              <TextInput
                placeholder="Your Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor="#666"
              />
            </View>

            {/* signup button */}
            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <AppText style={styles.buttonText}>Sign Up</AppText>
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
    color: "black",
    marginBottom: 12,
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

  /* input */
  inputContainer: {
    width: "80%",
  },
  input: {
    backgroundColor: "#fff",
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
});
