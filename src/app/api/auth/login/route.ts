import { NextRequest, NextResponse } from "next/server";
import { loginUser, sanitizeUser } from "@/lib/auth-server";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { checkRateLimit, ipKey } from "@/lib/rate-limiter";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 requests / minute per IP
    const rl = checkRateLimit(`login:${ipKey(req)}`, { limit: 5, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) } },
      );
    }

    const body = loginSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { emailOrUsername, password } = body.data;

    const user = loginUser(emailOrUsername, password);

    // Create JWT session instead of in-memory token
    const token = await createSession({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    const response = NextResponse.json(
      { user: sanitizeUser(user) },
      { status: 200 },
    );

    response.cookies.set(SESSION_COOKIE, token, {
      ...sessionCookieOptions(),
      // No maxAge = session cookie (cleared when browser closes)
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";

    // Don't reveal whether the user exists
    if (message.includes("Invalid")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
