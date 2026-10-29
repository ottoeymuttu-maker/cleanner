// ชั้นข้อมูล (data layer)
// มีค่า Firebase ใน env → ใช้ Firestore, ไม่มี → ใช้ไฟล์ data/db.json บนเครื่อง
// หน้าเว็บและ actions เรียกผ่านไฟล์นี้เท่านั้น จึงสลับ backend ได้โดยไม่ต้องแก้ส่วนอื่น

import path from "path";
import type { Backend } from "./backend";
import { firestoreBackend } from "./firestore";
import { jsonBackend } from "./json";

const useFirestore = !!(process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.FIREBASE_PROJECT_ID);
const backend: Backend = useFirestore ? firestoreBackend : jsonBackend;

// TODO: ย้ายไป Firebase Storage ก่อนขึ้น production (โฮสต์ส่วนใหญ่ไม่มีดิสก์ถาวร)
export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export const getSettings = () => backend.getSettings();
export const listServices = () => backend.listServices();
export const listUsers = (role?: Parameters<Backend["listUsers"]>[0]) => backend.listUsers(role);
export const getUser = (id: string) => backend.getUser(id);
export const listJobs = async () =>
  (await backend.listJobs()).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
export const getJob = (id: string) => backend.getJob(id);
export const createJob: Backend["createJob"] = (input) => backend.createJob(input);
export const updateJob: Backend["updateJob"] = (id, fn) => backend.updateJob(id, fn);
export const upsertService: Backend["upsertService"] = (s) => backend.upsertService(s);
export const upsertUser: Backend["upsertUser"] = (u) => backend.upsertUser(u);
export const updateSettings: Backend["updateSettings"] = (p) => backend.updateSettings(p);

export function newId(prefix: string) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
