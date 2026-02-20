import type { SessionJwtPayload } from "../types";
import { timingSafeEqual } from "./security";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signHmac(message: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(new Uint8Array(signature));
}

export async function signJwt(payload: SessionJwtPayload, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = toBase64Url(encoder.encode(JSON.stringify(header)));
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHmac(signingInput, secret);
  return `${signingInput}.${signature}`;
}

export async function verifyJwt(token: string, secret: string): Promise<SessionJwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, providedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = await signHmac(signingInput, secret);
  if (!timingSafeEqual(expectedSignature, providedSignature)) {
    return null;
  }

  try {
    const payloadBytes = fromBase64Url(encodedPayload);
    const payload = JSON.parse(decoder.decode(payloadBytes)) as SessionJwtPayload;
    if (!payload?.sub || !payload?.email || !payload?.exp || !payload?.iat) {
      return null;
    }
    if (Math.floor(Date.now() / 1000) >= payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  const cookies = cookieHeader.split(";");
  for (const entry of cookies) {
    const [rawKey, ...rawValueParts] = entry.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }
  return null;
}

interface SessionCookieOptions {
  secure: boolean;
  maxAgeSeconds: number;
  sameSite?: "Lax" | "None";
}

export function createSessionCookie(name: string, token: string, options: SessionCookieOptions): string {
  const sameSite = options.sameSite ?? "Lax";
  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`
  ];

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearSessionCookie(name: string, secure: boolean, sameSite: "Lax" | "None" = "Lax"): string {
  const parts = [`${name}=`, "Path=/", "HttpOnly", `SameSite=${sameSite}`, "Max-Age=0"];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
