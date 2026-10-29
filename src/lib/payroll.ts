import { jobTotals } from "./pricing";
import { TZ } from "./status";
import { hoursFor } from "./timesheet";
import type { Job, PayoutLine, Service, User } from "./types";

export const WHT_RATE = 0.03; // หัก ณ ที่จ่ายค่าบริการ 3%

export const PAY_MODEL_LABEL = {
  hourly: "รายชั่วโมง (บาท/ชม.)",
  per_job: "เหมาต่องาน (บาท/งาน)",
  commission: "ค่าคอมมิชชั่น (% ของยอดงาน)",
  per_service: "ตามรายการบริการ (บาท/หน่วย)",
} as const;

export const bkkMonth = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);

export function monthRange(month: string) {
  const from = new Date(`${month}-01T00:00:00+07:00`);
  const to = new Date(from);
  to.setMonth(to.getMonth() + 1);
  return { from, to };
}

/** ค่าแรงต่อหน่วยของบริการ สำหรับพนักงานคนนี้ (ราคาเฉพาะคน → ราคามาตรฐานของบริการ) */
export function unitPay(staff: User, serviceId: string | null, services: Service[]) {
  if (!serviceId) return 0;
  return staff.staff?.serviceRates?.[serviceId] ?? services.find((s) => s.id === serviceId)?.staffPay ?? 0;
}

const DONE = ["completed", "closed"];

/** ค่าแรงที่พนักงาน 1 คนได้จากงาน 1 งาน (ถ้ามีหลายคนในงานเดียว แบ่งเท่ากัน ยกเว้นรายชั่วโมงคิดตามเวลาจริง) */
export function jobEarning(staff: User, job: Job, services: Service[]): PayoutLine | null {
  const p = staff.staff;
  if (!p || !job.staffIds.includes(staff.id) || !DONE.includes(job.status)) return null;
  const share = 1 / job.staffIds.length;
  let amount = 0;
  let detail = "";

  if (p.payModel === "hourly") {
    const hours = job.checkIns
      .filter((c) => c.staffId === staff.id && c.outAt)
      .reduce((s, c) => s + (new Date(c.outAt!).getTime() - new Date(c.inAt).getTime()) / 36e5, 0);
    amount = hours * p.rate;
    detail = `${hours.toFixed(2)} ชม. × ${p.rate}`;
  } else if (p.payModel === "per_job") {
    amount = p.rate * share;
    detail = `เหมา ${p.rate}${share < 1 ? ` ÷ ${job.staffIds.length} คน` : ""}`;
  } else if (p.payModel === "commission") {
    const total = jobTotals(job).total;
    amount = (total * p.rate * share) / 100;
    detail = `${p.rate}% ของ ${total.toLocaleString()}${share < 1 ? ` ÷ ${job.staffIds.length} คน` : ""}`;
  } else {
    const parts = job.items.map((i) => {
      const u = unitPay(staff, i.serviceId, services);
      amount += i.qty * u * share;
      return `${i.name} ${i.qty}×${u}`;
    });
    detail = parts.join(", ") + (share < 1 ? ` ÷ ${job.staffIds.length} คน` : "");
  }
  return { jobId: job.id, code: job.code, date: job.scheduledAt, detail, amount: Math.round(amount * 100) / 100 };
}

/** งานที่ทำเสร็จแล้วแต่ยังไม่ได้ทำรายการจ่ายให้พนักงานคนนี้ */
export function unpaidLines(staff: User, jobs: Job[], services: Service[]) {
  return jobs
    .filter((j) => !j.payouts?.[staff.id])
    .map((j) => jobEarning(staff, j, services))
    .filter((l): l is PayoutLine => !!l)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function payoutTotals(lines: PayoutLine[], adjustments: { amount: number }[], withholding: boolean) {
  const gross = lines.reduce((s, l) => s + l.amount, 0) + adjustments.reduce((s, a) => s + a.amount, 0);
  const wht = withholding ? Math.round(gross * WHT_RATE * 100) / 100 : 0;
  return { gross, wht, net: Math.round((gross - wht) * 100) / 100 };
}

/** สรุปรายเดือน: ชั่วโมง งานเสร็จ และค่าแรงตามงานในเดือนนั้น */
export function payrollRow(staff: User, jobs: Job[], services: Service[], month: string) {
  const { from, to } = monthRange(month);
  const inMonth = jobs.filter((j) => bkkMonth(j.scheduledAt) === month);
  const lines = inMonth.map((j) => jobEarning(staff, j, services)).filter((l): l is PayoutLine => !!l);
  const jobValue = inMonth
    .filter((j) => j.staffIds.includes(staff.id) && DONE.includes(j.status))
    .reduce((s, j) => s + jobTotals(j).total / j.staffIds.length, 0);
  return {
    staff,
    jobs: lines.length,
    hours: hoursFor(jobs, staff.id, from, to),
    jobValue,
    pay: lines.reduce((s, l) => s + l.amount, 0),
  };
}
