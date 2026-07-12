import { NextRequest, NextResponse } from "next/server";
import { getUserById, sanitizeUser } from "@/lib/auth-server";
import { verifySession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    // No cookie at all — not authenticated
    const response = NextResponse.json({ user: null }, { status: 200 });
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  // Verify JWT
  const session = await verifySession(token);

  if (!session) {
    // Token is invalid or expired — clear the stale cookie
    const response = NextResponse.json({ user: null }, { status: 200 });
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  // Look up user by ID from JWT payload
  const user = getUserById(session.userId);
  if (!user) {
    // User was deleted but token is still valid — clear it
    const response = NextResponse.json({ user: null }, { status: 200 });
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  // Re-set as session cookie (no maxAge) — converts any existing persistent
  // cookie so it clears on browser close
  const response = NextResponse.json(
    { user: sanitizeUser(user) },
    { status: 200 },
  );
  response.cookies.set(SESSION_COOKIE, token, {
    ...sessionCookieOptions(),
  });
  return response;
}
