import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  // JWT is stateless — no server-side state to clean.
  // Just clear the httpOnly cookie. The token remains valid until expiry
  // but without the cookie it can't be used.
  const response = NextResponse.json(
    { message: "Logged out" },
    { status: 200 },
  );
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}
