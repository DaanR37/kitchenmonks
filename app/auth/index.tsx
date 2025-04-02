import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";

export default function AuthChooseScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo KM hier */}
      <View style={styles.logoContainer}>
        <Image source={require("../../assets/images/logo-login-screen.png")} style={styles.logo} />
        <Text style={styles.title}>KITCHENMONKS</Text>
      </View>

      {/* Knop voor login */}
      <View style={styles.buttonContainer}>
        <Text style={styles.subtitle}>Welcome to KitchenMonks - Let's create your account</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push("/auth/login")}>
          <Text style={styles.buttonText}>Log in</Text>
        </TouchableOpacity>

        {/* Knop voor signup */}
        <TouchableOpacity
          style={[styles.button, styles.signupButton]}
          onPress={() => router.push("/auth/signup")}
        >
          <Text style={[styles.buttonText, { color: "#000" }]}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  button: {
    width: "80%",
    padding: 16,
    marginVertical: 8,
    borderRadius: 50,
    alignItems: "center",
    backgroundColor: "#000",
  },
  signupButton: {
    backgroundColor: "#ffffff",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    alignSelf: "center",
  },
});
