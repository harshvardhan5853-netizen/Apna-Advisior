import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, sanitizeUser } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = getUserByToken(token);

  // Token exists but session is invalid (e.g. server restart wiped in-memory sessions)
  // Clear the stale cookie so middleware stops letting requests through
  if (!user) {
    const response = NextResponse.json({ user: null }, { status: 200 });
    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  return NextResponse.json(
    { user: sanitizeUser(user) },
    { status: 200 },
  );
}
