import Ionicons from "@expo/vector-icons/build/Ionicons";

export type StatusMeta = {
  backgroundColor: string;
  borderColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

export const STATUS_META: Record<string, StatusMeta> = {
  done: {
    backgroundColor: "#00AA00",
    icon: "checkmark" as keyof typeof Ionicons.glyphMap,
    iconColor: "#fff",
  },
  "in progress": {
    backgroundColor: "#0066ff",
    icon: "refresh" as keyof typeof Ionicons.glyphMap,
    iconColor: "#fff",
  },
  "to do": { backgroundColor: "transparent", borderColor: "#999" }, // was: active
  inactive: { backgroundColor: "transparent", borderColor: "#ccc", icon: "help-outline", iconColor: "#333" },
  "no status": {
    backgroundColor: "transparent",
    borderColor: "#ccc",
    icon: "help-outline" as keyof typeof Ionicons.glyphMap,
  }, // was: inactive
  "out of stock": {
    backgroundColor: "#ff6347",
    icon: "alert" as keyof typeof Ionicons.glyphMap,
    iconColor: "#fff",
  },
  skip: { backgroundColor: "#ff0055", icon: "close" as keyof typeof Ionicons.glyphMap, iconColor: "#fff" },
  edit: { backgroundColor: "#000", icon: "create" as keyof typeof Ionicons.glyphMap },
};
