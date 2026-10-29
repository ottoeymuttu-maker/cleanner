import type { JobStatus } from "./types";

export const STATUS_LABEL: Record<JobStatus, string> = {
  requested: "รอประเมินราคา",
  quoted: "รอยืนยันใบเสนอราคา",
  confirmed: "ยืนยันแล้ว รอจัดช่าง",
  assigned: "จัดช่างแล้ว",
  on_the_way: "ช่างกำลังเดินทาง",
  in_progress: "กำลังทำงาน",
  completed: "ทำงานเสร็จ รอยืนยัน",
  closed: "ปิดงานแล้ว",
  cancelled: "ยกเลิก",
};

export const STATUS_COLOR: Record<JobStatus, string> = {
  requested: "bg-amber-100 text-amber-800",
  quoted: "bg-orange-100 text-orange-800",
  confirmed: "bg-sky-100 text-sky-800",
  assigned: "bg-indigo-100 text-indigo-800",
  on_the_way: "bg-violet-100 text-violet-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-teal-100 text-teal-800",
  closed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
};

/** ลำดับขั้นที่ลูกค้าเห็นในหน้า tracking */
export const TRACK_STEPS: JobStatus[] = [
  "quoted",
  "confirmed",
  "assigned",
  "on_the_way",
  "in_progress",
  "completed",
  "closed",
];

export const TZ = "Asia/Bangkok";

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
