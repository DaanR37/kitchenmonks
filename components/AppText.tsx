import { Text as RNText, TextProps, StyleSheet } from "react-native";

export default function AppText(props: TextProps) {
  return <RNText {...props} style={[styles.default, props.style]} />;
}

const styles = StyleSheet.create({
  default: {
    fontFamily: "Inter_400Regular",
  },
});