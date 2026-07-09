import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

/* ─── File-based persistence (users only) ─── */
// Vercel serverless: only /tmp is writable; process.cwd()/.auth would fail with
// "ENOENT: mkdir '/var/task/.auth'" because the function root is read-only.
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

// ═══ Sessions are IN-MEMORY ONLY ═══
// NOT persisted to disk. When the server restarts, every session is gone.
// The user must re-enter their password.
let sessions = new Map<string, string>();

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
  return timingSafeEqual(Buffer.from(key), Buffer.from(derived));
}

/* ─── Persistence helpers ─── */
function persistUsers(): void {
  writeJson(USERS_FILE, Object.fromEntries(users));
}

/* ─── Session management ─── */
function createToken(): string {
  return randomBytes(32).toString("hex");
}

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
): { user: StoredUser; token: string } {
  const lookup = emailOrUsername.toLowerCase();
  const user = Array.from(users.values()).find(
    (u) => u.email === lookup || u.username === lookup,
  );
  if (!user) throw new Error("Invalid email/username or password");
  if (!verifyPassword(password, user.passwordHash))
    throw new Error("Invalid email/username or password");

  const token = createToken();
  sessions.set(token, user.id);
  return { user, token };
}

export function getUserByToken(token: string): StoredUser | null {
  const userId = sessions.get(token);
  if (!userId) return null;
  return users.get(userId) ?? null;
}

export function logoutUser(token: string): void {
  sessions.delete(token);
}

export function sanitizeUser(user: StoredUser) {
  const { passwordHash, ...safe } = user;
  return safe;
}
