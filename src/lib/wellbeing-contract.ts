export type AIMode = "questions" | "reflection" | "fasting";
export interface AIResult {
  questions: string[];
  reflection: string;
  nutrition: string;
  sleep: string;
  health: string;
  spiritual: string;
}

export function validRequest(value: unknown): value is { mode: AIMode; context: Record<string, string> } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some((key) => !["mode", "context"].includes(key))) return false;
  if (!["questions", "reflection", "fasting"].includes(String(v.mode)) || !v.context || typeof v.context !== "object" || Array.isArray(v.context)) return false;
  const allowed = ["mood", "feeling", "goal", "sleep", "activity", "health", "food", "status"];
  return Object.entries(v.context).every(([key, text]) => allowed.includes(key) && typeof text === "string" && text.length <= 1000 && (key !== "sleep" || (text.trim() !== "" && Number.isFinite(Number(text)) && Number(text) >= 0 && Number(text) <= 24)));
}

export function validResult(value: unknown, mode: AIMode = "questions"): value is AIResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.questions) && (v.questions.length === 2 || (mode !== "questions" && v.questions.length === 0)) && v.questions.every((q) => typeof q === "string" && q.length > 0 && q.length <= 400) &&
    ["reflection", "nutrition", "sleep", "health", "spiritual"].every((key) => typeof v[key] === "string" && (v[key] as string).length <= 1500);
}
