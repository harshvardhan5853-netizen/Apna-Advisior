import { NextRequest, NextResponse } from "next/server";
import { loginUser, sanitizeUser } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const { emailOrUsername, password } = await req.json();

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Email/Username and password are required" },
        { status: 400 },
      );
    }

    const { user, token } = loginUser(emailOrUsername, password);

    const response = NextResponse.json(
      { user: sanitizeUser(user), token },
      { status: 200 },
    );

    // Set httpOnly cookie for SSR / middleware protection
    // No maxAge — session cookie, dies when browser closes
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
