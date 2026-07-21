export const ENV_TABLE_NAME = "ENV";

export function isEnvTable(name: string | null | undefined) {
  return name?.trim().toLowerCase() === "env";
}

export function isReservedEnvTableName(name: string) {
  return isEnvTable(name);
}

export function countEnvVariables(content: string | null | undefined) {
  if (!content) return 0;

  return content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("#") && trimmed.includes("=");
    }).length;
}
