import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/* ─── JWT Configuration ─── */

const JWT_ISSUER = "apna-advisor";
const JWT_AUDIENCE = "apna-advisor-users";
const JWT_EXPIRY = "24h";
export const SESSION_COOKIE = "session_token";

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET ?? "dev-secret-do-not-use-in-production-min-32-chars!!";
  return new TextEncoder().encode(raw);
}

/* ─── Types ─── */

export interface SessionPayload {
  userId: string;
  email: string;
  username: string;
}

/* ─── Sign / Verify ─── */

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const { userId, email, username } = payload as unknown as SessionPayload;
    if (!userId || !email) return null;
    return { userId, email, username };
  } catch {
    return null;
  }
}

/* ─── Cookie helpers ─── */

export function sessionCookieOptions(): Record<string, string | boolean | number> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}
