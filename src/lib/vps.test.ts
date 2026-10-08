import assert from "node:assert/strict";

async function main() {
  process.env.NEXT_PUBLIC_VPS_API_URL = "https://example.test";
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
  Object.defineProperty(globalThis, "window", { value: new EventTarget() });
  const { connectVps, vpsRequest } = await import("./vps");
  globalThis.fetch = async (url) => String(url).endsWith("/connect") ? Response.json({ token: "test-session" }) : new Response(null, { status: 503 });
  await connectVps("test-code");
  assert.equal(values.get("ps.vps-session"), "test-session", "Backup failure must not block login");
  globalThis.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(vpsRequest("/chat", {}), /dihubungkan kembali/);
  assert.equal(values.has("ps.vps-session"), false);
  values.set("ps.vps-session", "test-session");
  globalThis.fetch = async () => { throw new TypeError("network"); };
  await assert.rejects(vpsRequest("/chat", {}), /Periksa internet/);
  console.log("VPS recovery checks passed");
}
void main();
