// Backend สำหรับพัฒนาบนเครื่อง: เก็บทุกอย่างในไฟล์ data/db.json

import { promises as fs } from "fs";
import path from "path";
import type { DbShape, Payout } from "../types";
import type { Backend } from "./backend";
import { seedData } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let writeQueue: Promise<unknown> = Promise.resolve();

async function load(): Promise<DbShape> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  } catch {
    const data = seedData();
    await save(data);
    return data;
  }
}

async function save(data: DbShape) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

/** อ่าน-แก้-เขียน แบบเรียงคิว กันข้อมูลทับกันเมื่อมีหลาย request พร้อมกัน */
function mutate<T>(fn: (db: DbShape) => T): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

export const jsonBackend: Backend = {
  getSettings: async () => (await load()).settings,
  listServices: async () => (await load()).services,
  listUsers: async (role) => (await load()).users.filter((u) => !role || u.role === role),
  getUser: async (id) => (await load()).users.find((u) => u.id === id),
  listJobs: async () => (await load()).jobs,
  getJob: async (id) => (await load()).jobs.find((j) => j.id === id),

  createJob: (input) =>
    mutate((db) => {
      db.seq += 1;
      const job = { ...input, id: "j" + db.seq, code: "JOB-" + String(db.seq).padStart(4, "0"), createdAt: new Date().toISOString() };
      db.jobs.push(job);
      return job;
    }),

  updateJob: (id, fn) =>
    mutate((db) => {
      const job = db.jobs.find((j) => j.id === id);
      if (!job) throw new Error("ไม่พบงาน " + id);
      fn(job);
      return job;
    }),

  upsertService: (service) =>
    mutate((db) => {
      const i = db.services.findIndex((s) => s.id === service.id);
      if (i >= 0) db.services[i] = service;
      else db.services.push(service);
    }),

  upsertUser: (user) =>
    mutate((db) => {
      const i = db.users.findIndex((u) => u.id === user.id);
      if (i >= 0) db.users[i] = user;
      else db.users.push(user);
    }),

  deleteUser: (id) =>
    mutate((db) => {
      db.users = db.users.filter((u) => u.id !== id);
    }),

  updateSettings: (patch) =>
    mutate((db) => {
      db.settings = { ...db.settings, ...patch };
    }),

  listPayouts: async () => (await load()).payouts ?? [],
  getPayout: async (id) => (await load()).payouts?.find((p) => p.id === id),

  createPayout: (input) =>
    mutate((db) => {
      db.payoutSeq = (db.payoutSeq ?? 0) + 1;
      const payout: Payout = { ...input, id: "p" + db.payoutSeq, code: "PAY-" + String(db.payoutSeq).padStart(4, "0") };
      const jobs = input.lines.map((l) => db.jobs.find((j) => j.id === l.jobId));
      if (jobs.some((j) => !j || j.payouts?.[input.staffId])) throw new Error("มีงานที่ทำรายการจ่ายไปแล้ว");
      for (const j of jobs) j!.payouts = { ...j!.payouts, [input.staffId]: payout.id };
      (db.payouts ??= []).push(payout);
      return payout;
    }),

  updatePayout: (id, patch) =>
    mutate((db) => {
      const payout = db.payouts?.find((p) => p.id === id);
      if (!payout) throw new Error("ไม่พบรายการจ่าย " + id);
      Object.assign(payout, patch);
      if (patch.status === "void") {
        for (const j of db.jobs) if (j.payouts?.[payout.staffId] === id) delete j.payouts[payout.staffId];
      }
      return payout;
    }),
};
