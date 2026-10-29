// Backend Firestore (ใช้ firebase-admin ฝั่ง server เท่านั้น)
//
// โครงสร้าง collection:
//   config/settings      ตั้งค่าร้าน
//   config/counters      { jobSeq } ใช้รันเลขงาน JOB-xxxx
//   services/{id}
//   users/{id}           ลูกค้า / พนักงาน / แอดมิน (staff profile ฝังใน field staff)
//   jobs/{id}            timeline, photos, checkIns ฝังใน document เดียวกัน
//   payouts/{id}         รายการจ่ายค่าแรงช่าง/แม่บ้าน (config/counters.payoutSeq รันเลข PAY-xxxx)

import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { firebaseApp } from "../firebase";
import type { Job, Payout, Service, Settings, User } from "../types";
import type { Backend } from "./backend";
import { seedData } from "./seed";

let db: Firestore | undefined;
let seeded: Promise<void> | undefined;

function firestore() {
  if (db) return db;
  db = getFirestore(firebaseApp());
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // ตั้งค่าไปแล้ว (เกิดตอน hot reload ใน dev)
  }
  return db;
}

/** ครั้งแรกที่ฐานข้อมูลว่าง ใส่ข้อมูลตัวอย่างให้ */
function ensureSeed() {
  seeded ??= (async () => {
    const fs = firestore();
    if ((await fs.doc("config/settings").get()).exists) return;
    const data = seedData();
    const batch = fs.batch();
    batch.set(fs.doc("config/settings"), data.settings);
    batch.set(fs.doc("config/counters"), { jobSeq: data.seq });
    for (const s of data.services) batch.set(fs.doc(`services/${s.id}`), s);
    for (const u of data.users) batch.set(fs.doc(`users/${u.id}`), u);
    for (const j of data.jobs) batch.set(fs.doc(`jobs/${j.id}`), j);
    await batch.commit();
  })().catch((e) => {
    seeded = undefined; // ให้ลองใหม่ในคำขอถัดไป
    throw e;
  });
  return seeded.then(firestore);
}

export const firestoreBackend: Backend = {
  async getSettings() {
    const fs = await ensureSeed();
    return (await fs.doc("config/settings").get()).data() as Settings;
  },
  async listServices() {
    const fs = await ensureSeed();
    return (await fs.collection("services").get()).docs.map((d) => d.data() as Service);
  },
  async listUsers(role) {
    const fs = await ensureSeed();
    const q = role ? fs.collection("users").where("role", "==", role) : fs.collection("users");
    return (await q.get()).docs.map((d) => d.data() as User);
  },
  async getUser(id) {
    const fs = await ensureSeed();
    return (await fs.doc(`users/${id}`).get()).data() as User | undefined;
  },
  async listJobs() {
    // TODO: เมื่องานเยอะให้แบ่งหน้า/กรองตามช่วงวันที่แทนการดึงทั้งหมด
    const fs = await ensureSeed();
    return (await fs.collection("jobs").get()).docs.map((d) => d.data() as Job);
  },
  async getJob(id) {
    const fs = await ensureSeed();
    return (await fs.doc(`jobs/${id}`).get()).data() as Job | undefined;
  },

  async createJob(input) {
    const fs = await ensureSeed();
    return fs.runTransaction(async (tx) => {
      const counterRef = fs.doc("config/counters");
      const seq = ((await tx.get(counterRef)).data()?.jobSeq ?? 0) + 1;
      const job: Job = { ...input, id: "j" + seq, code: "JOB-" + String(seq).padStart(4, "0"), createdAt: new Date().toISOString() };
      tx.set(counterRef, { jobSeq: seq }, { merge: true });
      tx.set(fs.doc(`jobs/${job.id}`), job);
      return job;
    });
  },

  async updateJob(id, fn) {
    const fs = await ensureSeed();
    return fs.runTransaction(async (tx) => {
      const ref = fs.doc(`jobs/${id}`);
      const job = (await tx.get(ref)).data() as Job | undefined;
      if (!job) throw new Error("ไม่พบงาน " + id);
      fn(job);
      tx.set(ref, job);
      return job;
    });
  },

  async upsertService(service) {
    await (await ensureSeed()).doc(`services/${service.id}`).set(service);
  },
  async upsertUser(user) {
    await (await ensureSeed()).doc(`users/${user.id}`).set(user);
  },
  async deleteUser(id) {
    await (await ensureSeed()).doc(`users/${id}`).delete();
  },
  async updateSettings(patch) {
    await (await ensureSeed()).doc("config/settings").set(patch, { merge: true });
  },

  async listPayouts() {
    const fs = await ensureSeed();
    return (await fs.collection("payouts").get()).docs.map((d) => d.data() as Payout);
  },
  async getPayout(id) {
    const fs = await ensureSeed();
    return (await fs.doc(`payouts/${id}`).get()).data() as Payout | undefined;
  },

  async createPayout(input) {
    const fs = await ensureSeed();
    return fs.runTransaction(async (tx) => {
      const counterRef = fs.doc("config/counters");
      const jobRefs = input.lines.map((l) => fs.doc(`jobs/${l.jobId}`));
      const [counter, ...jobSnaps] = await Promise.all([tx.get(counterRef), ...jobRefs.map((r) => tx.get(r))]);
      const jobs = jobSnaps.map((s) => s.data() as Job | undefined);
      if (jobs.some((j) => !j || j.payouts?.[input.staffId])) throw new Error("มีงานที่ทำรายการจ่ายไปแล้ว");

      const seq = (counter.data()?.payoutSeq ?? 0) + 1;
      const payout: Payout = { ...input, id: "p" + seq, code: "PAY-" + String(seq).padStart(4, "0") };
      tx.set(counterRef, { payoutSeq: seq }, { merge: true });
      tx.set(fs.doc(`payouts/${payout.id}`), payout);
      jobRefs.forEach((ref) => tx.set(ref, { payouts: { [input.staffId]: payout.id } }, { merge: true }));
      return payout;
    });
  },

  async updatePayout(id, patch) {
    const fs = await ensureSeed();
    return fs.runTransaction(async (tx) => {
      const ref = fs.doc(`payouts/${id}`);
      const payout = (await tx.get(ref)).data() as Payout | undefined;
      if (!payout) throw new Error("ไม่พบรายการจ่าย " + id);
      if (patch.status === "void") {
        const jobRefs = payout.lines.map((l) => fs.doc(`jobs/${l.jobId}`));
        const snaps = await Promise.all(jobRefs.map((r) => tx.get(r)));
        snaps.forEach((s, i) => {
          const job = s.data() as Job | undefined;
          if (job?.payouts?.[payout.staffId] === id) {
            delete job.payouts[payout.staffId];
            tx.set(jobRefs[i], job);
          }
        });
      }
      const next = { ...payout, ...patch };
      tx.set(ref, next);
      return next;
    });
  },
};
