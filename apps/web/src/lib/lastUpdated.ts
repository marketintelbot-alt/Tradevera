import { BUILD_LAST_UPDATED_ISO } from "@/generated/buildMeta";

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(parsed);
}

export const LAST_UPDATED_ISO = BUILD_LAST_UPDATED_ISO;
export const LAST_UPDATED_LABEL = formatDate(BUILD_LAST_UPDATED_ISO);
