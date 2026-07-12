import { randomBytes, scryptSync } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

/* ─── File-based persistence (users only) ─── */
const DATA_DIR = process.env.VERCEL === "1" ? "/tmp/.auth" : join(process.cwd(), ".auth");
const USERS_FILE = join(DATA_DIR, "users.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  ensureDataDir();
  writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

export interface StoredUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

let users = new Map(Object.entries(readJson<Record<string, StoredUser>>(USERS_FILE, {})));

// ═══ Sessions are NOW handled by JWT (src/lib/auth.ts) ═══
// No in-memory Map — JWT is stateless. Server restart does NOT log users out.

/* ─── Password hashing (Node scrypt) ─── */
const SALT_LEN = 16;
const KEY_LEN = 64;

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const derived = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  const derived = scryptSync(password, salt, KEY_LEN).toString("hex");
  return key.length === derived.length && timingSafeEqual(Buffer.from(key), Buffer.from(derived));
}

import { timingSafeEqual } from "crypto";

/* ─── Persistence helpers ─── */
function persistUsers(): void {
  writeJson(USERS_FILE, Object.fromEntries(users));
}

/* ─── User management ─── */
export function registerUser(
  fullName: string,
  username: string,
  email: string,
  password: string,
): StoredUser {
  const existing =
    Array.from(users.values()).find(
      (u) => u.email === email || u.username === username,
    );
  if (existing) {
    if (existing.email === email) throw new Error("Email already registered");
    throw new Error("Username already taken");
  }

  const user: StoredUser = {
    id: randomBytes(12).toString("hex"),
    fullName,
    username,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  persistUsers();
  return user;
}

export function loginUser(
  emailOrUsername: string,
  password: string,
): StoredUser {
  const lookup = emailOrUsername.toLowerCase();
  const user = Array.from(users.values()).find(
    (u) => u.email === lookup || u.username === lookup,
  );
  if (!user) throw new Error("Invalid email/username or password");
  if (!verifyPassword(password, user.passwordHash))
    throw new Error("Invalid email/username or password");

  return user;
}

/** Get a user by their ID. Used after JWT verification. */
export function getUserById(userId: string): StoredUser | null {
  return users.get(userId) ?? null;
}

export function sanitizeUser(user: StoredUser) {
  const { passwordHash, ...safe } = user;
  return safe;
}
