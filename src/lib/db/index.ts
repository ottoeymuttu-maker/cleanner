// ชั้นข้อมูล (data layer)
// มีค่า Firebase ใน env → ใช้ Firestore, ไม่มี → ใช้ไฟล์ data/db.json บนเครื่อง
// หน้าเว็บและ actions เรียกผ่านไฟล์นี้เท่านั้น จึงสลับ backend ได้โดยไม่ต้องแก้ส่วนอื่น

import type { User } from "../types";
import type { Backend } from "./backend";
import { firestoreBackend } from "./firestore";
import { jsonBackend } from "./json";

const useFirestore = !!(process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.FIREBASE_PROJECT_ID);
const backend: Backend = useFirestore ? firestoreBackend : jsonBackend;

export const getSettings = () => backend.getSettings();
export const listServices = async () =>
  (await backend.listServices()).sort((a, b) => a.category.localeCompare(b.category) || a.price - b.price);
export const listUsers = (role?: Parameters<Backend["listUsers"]>[0]) => backend.listUsers(role);
export const getUser = (id: string) => backend.getUser(id);
export const listJobs = async () =>
  (await backend.listJobs()).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
export const getJob = (id: string) => backend.getJob(id);
export const createJob: Backend["createJob"] = (input) => backend.createJob(input);
export const updateJob: Backend["updateJob"] = (id, fn) => backend.updateJob(id, fn);
export const upsertService: Backend["upsertService"] = (s) => backend.upsertService(s);
export const upsertUser: Backend["upsertUser"] = (u) => backend.upsertUser(u);
export const deleteUser: Backend["deleteUser"] = (id) => backend.deleteUser(id);
export const findUserByLine = async (lineUserId: string, role: User["role"]) =>
  (await backend.listUsers(role)).find((u) => u.lineUserId === lineUserId);
export const updateSettings: Backend["updateSettings"] = (p) => backend.updateSettings(p);
export const listPayouts = async () =>
  (await backend.listPayouts()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const getPayout = (id: string) => backend.getPayout(id);
export const createPayout: Backend["createPayout"] = (input) => backend.createPayout(input);
export const updatePayout: Backend["updatePayout"] = (id, patch) => backend.updatePayout(id, patch);

export function newId(prefix: string) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
