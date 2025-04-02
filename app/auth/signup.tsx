import React, { useState } from "react";
import {
  View,
  Text,
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
          {/* Logo KM hier */}
          <View style={styles.logoContainer}>
            <Image source={require("../../assets/images/logo-login-screen.png")} style={styles.logo} />
            <Text style={styles.title}>KITCHENMONKS</Text>
          </View>

          <View style={styles.buttonContainer}>
            <Text style={styles.subtitle}>Welcome to KitchenMonks - Let's create your account</Text>
            <View style={styles.inputContainer}>
              <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
              <TextInput
                placeholder="Wachtwoord"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
              <TextInput
                placeholder="Herhaal wachtwoord"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
              />
              <TextInput
                placeholder="Kitchen Name"
                value={kitchenName}
                onChangeText={setKitchenName}
                style={styles.input}
              />
              <TextInput placeholder="Your Name" value={name} onChangeText={setName} style={styles.input} />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
          {/* <TouchableOpacity onPress={() => router.push("/auth")}>
        <Text style={styles.backText}>Terug</Text>
      </TouchableOpacity> */}
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
    marginBottom: 12,
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
