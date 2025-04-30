import React from "react";
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import AppText from "@/components/AppText";
export default function AuthChooseScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo KM hier */}
      <View style={styles.logoContainer}>
        <Image source={require("../../assets/images/KITCHENMONKSLOGOX.png")} style={styles.logo} />
        <AppText style={styles.title}>KITCHENMONKS</AppText>
      </View>

      {/* Knop voor login */}
      <View style={styles.buttonContainer}>
        <AppText style={styles.subtitle}>Welcome to KitchenMonks - Let's create your account</AppText>
        <TouchableOpacity style={styles.button} onPress={() => router.push("/auth/login")}>
          <AppText style={styles.buttonText}>Log in</AppText>
        </TouchableOpacity>

        {/* Knop voor signup */}
        <TouchableOpacity
          style={[styles.button, styles.signupButton]}
          onPress={() => router.push("/auth/signup")}
        >
          <AppText style={[styles.buttonText, { color: "#000" }]}>Sign up</AppText>
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
