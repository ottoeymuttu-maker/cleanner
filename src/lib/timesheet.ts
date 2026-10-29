import type { Job } from "./types";

/** ชั่วโมงทำงานจาก check-in/out ของพนักงาน ในช่วงเวลาที่กำหนด */
export function hoursFor(jobs: Job[], staffId: string, from: Date, to: Date) {
  let ms = 0;
  for (const j of jobs) {
    for (const c of j.checkIns) {
      if (c.staffId !== staffId || !c.outAt) continue;
      const inAt = new Date(c.inAt);
      if (inAt < from || inAt > to) continue;
      ms += new Date(c.outAt).getTime() - inAt.getTime();
    }
  }
  return ms / 36e5;
}

export function sessionsFor(jobs: Job[], staffId: string, from: Date, to: Date) {
  return jobs
    .flatMap((j) => j.checkIns.filter((c) => c.staffId === staffId).map((c) => ({ job: j, ...c })))
    .filter((s) => {
      const t = new Date(s.inAt);
      return t >= from && t <= to;
    })
    .sort((a, b) => a.inAt.localeCompare(b.inAt));
}
