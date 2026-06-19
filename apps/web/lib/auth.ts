// Sessao single-tenant do MVP. Um cookie assinado por HMAC-SHA256 com
// `AUTH_SECRET`. Usa apenas Web Crypto / TextEncoder / btoa-atob para
// funcionar tanto no middleware (edge) quanto nas route handlers (node).

export const SESSION_COOKIE = "ce_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

type SessionPayload = { sub: "single-tenant"; exp: number };

function getSecret(): string {
  return process.env.AUTH_SECRET || "dev-insecure-secret-troque-em-producao";
}

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64urlEncode(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const payload: SessionPayload = {
    sub: "single-tenant",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(encoded);
  return `${encoded}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expected = await sign(encoded);
  if (!timingSafeEqual(signature, expected)) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(encoded))) as SessionPayload;
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function checkPassword(candidate: unknown): boolean {
  const expected = process.env.APP_PASSWORD || "dev";
  return typeof candidate === "string" && candidate.length > 0 && timingSafeEqual(candidate, expected);
}
