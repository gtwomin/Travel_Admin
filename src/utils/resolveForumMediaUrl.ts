const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

/** 將文章內的相對圖片路徑解析為後端可存取的完整網址。 */
export const resolveForumMediaUrl = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value === "") return value ?? null;
  if (ABSOLUTE_URL_PATTERN.test(value)) return value;

  const apiBaseUrl = String(import.meta.env.VITE_API_URL ?? "").trim();
  const browserOrigin =
    typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null" ? window.location.origin : "";

  try {
    const baseUrl = ABSOLUTE_URL_PATTERN.test(apiBaseUrl) ? new URL(apiBaseUrl).origin : browserOrigin;
    if (!baseUrl) return value;
    return new URL(value, `${baseUrl.replace(/\/+$/, "")}/`).toString();
  } catch {
    return value;
  }
};
