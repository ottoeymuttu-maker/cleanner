import { jobTotals } from "./pricing";
import { TZ } from "./status";
import { hoursFor } from "./timesheet";
import type { Job, User } from "./types";

export const bkkMonth = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);

export function monthRange(month: string) {
  const from = new Date(`${month}-01T00:00:00+07:00`);
  const to = new Date(from);
  to.setMonth(to.getMonth() + 1);
  return { from, to };
}

/** สรุปชั่วโมงและค่าตอบแทนโดยประมาณ ของพนักงาน 1 คนใน 1 เดือน */
export function payrollRow(staff: User, jobs: Job[], month: string) {
  const { from, to } = monthRange(month);
  const p = staff.staff!;
  const done = jobs.filter(
    (j) => j.staffIds.includes(staff.id) && ["completed", "closed"].includes(j.status) && bkkMonth(j.scheduledAt) === month,
  );
  const hours = hoursFor(jobs, staff.id, from, to);
  const jobValue = done.reduce((s, j) => s + jobTotals(j).total / j.staffIds.length, 0);
  const pay =
    p.payModel === "hourly" ? hours * p.rate : p.payModel === "per_job" ? done.length * p.rate : (jobValue * p.rate) / 100;
  return { staff, jobs: done.length, hours, jobValue, pay };
}
