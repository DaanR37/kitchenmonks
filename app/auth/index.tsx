import React, { useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Image, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import AppText from "@/components/AppText";

export default function AuthChooseScreen() {
  const router = useRouter();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textOpacitySubtitle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 700,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacitySubtitle, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo & titel */}
      <View style={styles.logoContainer}>
        <Animated.Image
          source={require("../../assets/images/KITCHENMONKSLOGOX.png")}
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        />
        <Animated.Text style={[styles.title, { opacity: textOpacity }]}>KITCHENMONKS</Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: textOpacitySubtitle }]}>
          Welcome to KitchenMonks - Let's create your account or log in!
        </Animated.Text>
      </View>

      {/* Buttons voor login en signup */}
      <View style={styles.buttonContainer}>
        {/* Button voor login */}
        <TouchableOpacity style={styles.button} onPress={() => router.push("/auth/login")}>
          <AppText style={styles.buttonText}>Log in</AppText>
        </TouchableOpacity>

        {/* Button voor signup */}
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
    margin: 12,
    backgroundColor: "#f2f1f6",
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

  /* signup button */
  signupButton: {
    backgroundColor: "#ffffff",
  },
});
