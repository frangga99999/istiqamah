export type ChatMessage = { role: "user" | "assistant"; content: string };

export function validChat(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.length <= 100 && value.every((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0 && m.content.length <= 8000);
}

export function chatContext(messages: ChatMessage[]) {
  const result: ChatMessage[] = [];
  let length = 0;
  for (const message of messages.slice(-16).reverse()) {
    if (length + message.content.length > 16000) break;
    result.unshift(message); length += message.content.length;
  }
  return result;
}
