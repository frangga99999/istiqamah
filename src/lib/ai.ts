import { vpsRequest, vpsConfigured } from "@/lib/vps";
import { validResult, type AIMode } from "@/lib/wellbeing-contract";
export type { AIResult } from "@/lib/wellbeing-contract";

export const aiEnabled = vpsConfigured;

export async function askWellbeing(mode: AIMode, context: Record<string, string>) {
  if (!aiEnabled) throw new Error("Pendamping AI belum diaktifkan. Catatan tetap bisa disimpan tanpa AI.");
  const data: unknown = await vpsRequest("/wellbeing", { mode, context });
  if (!validResult(data, mode)) throw new Error("Jawaban AI belum lengkap. Silakan coba lagi.");
  return data;
}
