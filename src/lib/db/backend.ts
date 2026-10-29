import type { Job, Payout, Role, Service, Settings, User } from "../types";

/** สัญญาของชั้นข้อมูล — ทั้ง JSON (dev) และ Firestore ต้องทำตามนี้ */
export interface Backend {
  getSettings(): Promise<Settings>;
  listServices(): Promise<Service[]>;
  listUsers(role?: Role): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(input: Omit<Job, "id" | "code" | "createdAt">): Promise<Job>;
  /** fn แก้ไข job ตรง ๆ (mutate) ระบบจะบันทึกให้แบบ atomic */
  updateJob(id: string, fn: (job: Job) => void): Promise<Job>;
  upsertService(service: Service): Promise<void>;
  upsertUser(user: User): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;

  listPayouts(): Promise<Payout[]>;
  getPayout(id: string): Promise<Payout | undefined>;
  /** สร้างรายการจ่าย และผูกงานทุกงานใน lines กับรายการนี้ (atomic) — ถ้ามีงานที่จ่ายไปแล้วจะ error */
  createPayout(input: Omit<Payout, "id" | "code">): Promise<Payout>;
  /** แก้รายการจ่าย ถ้า status เป็น void จะปลดงานให้กลับไปเป็น "ยังไม่จ่าย" */
  updatePayout(id: string, patch: Partial<Payout>): Promise<Payout>;
}
