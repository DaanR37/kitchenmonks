import { View, Text, StyleSheet } from "react-native";

export default function MyTasksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Open Tasks</Text>
      {/* Lijst met open taken */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    padding: 16,
    paddingTop: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
