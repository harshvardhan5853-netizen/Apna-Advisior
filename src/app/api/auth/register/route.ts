import { NextRequest, NextResponse } from "next/server";
import { registerUser, sanitizeUser } from "@/lib/auth-server";
import { checkRateLimit, ipKey } from "@/lib/rate-limiter";
import { registerSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 registrations / hour per IP
    const rl = checkRateLimit(`register:${ipKey(req)}`, { limit: 3, windowMs: 3_600_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) } },
      );
    }

    const body = registerSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { fullName, username, email, password } = body.data;

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
