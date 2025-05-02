export function cleanTaskName(fullName: string) {
  const parts = fullName.split(" ");
  const lastPart = parts[parts.length - 1];
  if (/^\d{10,}$/.test(lastPart)) {
    parts.pop();
    return parts.join(" ");
  }
  return fullName;
}

export function generateInitials(firstName = "", lastName = "") {
  return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
}

export function getColorFromId(id: string) {
  const colorPalette = ["#3300ff", "#ff6200", "#00931d", "#d02350", "#6C63FF", "#FC3D21"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
}