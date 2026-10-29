// Mock LINE Login: เก็บ user id ไว้ใน cookie
// ของจริง: LIFF ส่ง ID token มา → ตรวจสอบกับ LINE (https://api.line.me/oauth2/v2.1/verify)
// → map lineUserId เป็น User แล้วออก session cookie แบบ signed

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "./db";
import type { Role } from "./types";

export const SESSION_COOKIE = "uid";

export async function currentUser() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return id ? getUser(id) : undefined;
}

export async function requireRole(role: Role) {
  const user = await currentUser();
  if (!user || user.role !== role) redirect("/?need=" + role);
  return user;
}
