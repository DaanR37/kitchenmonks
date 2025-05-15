import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";

export default function LoadingSpinner({
  size = "large",
  color = "#000",
}: {
  size?: "small" | "large";
  color?: string;
}) {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
});
