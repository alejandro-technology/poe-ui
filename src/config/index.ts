export const CORE_BASE_URL: string =
  ((import.meta.env.VITE_POE_CORE_URL as string | undefined) ?? "").trim() ||
  "http://localhost:3001";
