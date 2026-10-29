// Mock LINE Login: เก็บ user id ไว้ใน cookie
// ของจริง: LIFF ส่ง ID token มา → ตรวจสอบกับ LINE (https://api.line.me/oauth2/v2.1/verify)
// → map lineUserId เป็น User แล้วออก session cookie แบบ signed

import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "./db";
import type { Role } from "./types";

export const SESSION_COOKIE = "uid";

/** หน้าเลือกผู้ใช้ทดลอง: เปิดเฉพาะตอนพัฒนา (next dev) หรือตั้ง DEMO_LOGIN=true เอง ห้ามเปิดบนเว็บจริง */
export const demoLoginEnabled = () => process.env.NODE_ENV !== "production" || process.env.DEMO_LOGIN === "true";

function sessionSecret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("ต้องตั้งค่า SESSION_SECRET บนเว็บจริง");
  return "dev-only-session-secret";
}

const sign = (id: string) => createHmac("sha256", sessionSecret()).update(id).digest("base64url");

/** ค่า cookie = userId.signature กันการปลอม cookie เป็นผู้ใช้อื่น */
export function sessionValue(userId: string) {
  return `${userId}.${sign(userId)}`;
}

function verify(value: string) {
  const i = value.lastIndexOf(".");
  if (i <= 0) return undefined;
  const id = value.slice(0, i);
  const given = Buffer.from(value.slice(i + 1));
  const expected = Buffer.from(sign(id));
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : undefined;
}

export async function currentUser() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = raw && verify(raw);
  return id ? getUser(id) : undefined;
}

/** หน้า login ของแต่ละ role (อยู่ใต้ Endpoint ของ LIFF แต่ละตัว) */
export function loginPath(role: Role, next?: string) {
  const base = role === "customer" ? "/liff/login" : role === "staff" ? "/staff/login" : "/staff/login?as=admin";
  return next ? `${base}${base.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}` : base;
}

export async function requireRole(role: Role) {
  const user = await currentUser();
  const ok = user?.role === role && !(role === "staff" && (user.staff?.pendingApproval || !user.staff?.active));
  if (!ok) {
    if (demoLoginEnabled()) redirect("/?need=" + role);
    redirect(loginPath(role, (await headers()).get("x-pathname") ?? undefined));
  }
  return user!;
}
