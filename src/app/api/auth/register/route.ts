import { NextRequest, NextResponse } from "next/server";
import { registerUser, sanitizeUser } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const { fullName, username, email, password } = await req.json();

    if (!fullName || !username || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    if (fullName.length < 2) {
      return NextResponse.json(
        { error: "Full name must be at least 2 characters" },
        { status: 400 },
      );
    }

    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3+ characters (letters, numbers, underscores)" },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain an uppercase letter" },
        { status: 400 },
      );
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain a number" },
        { status: 400 },
      );
    }

    const user = registerUser(fullName, username, email, password);

    return NextResponse.json(
      { user: sanitizeUser(user), message: "Account created successfully" },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
