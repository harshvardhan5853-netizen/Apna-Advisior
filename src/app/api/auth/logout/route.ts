import { NextRequest, NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (token) logoutUser(token);

  const response = NextResponse.json(
    { message: "Logged out" },
    { status: 200 },
  );
  response.cookies.set("session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
