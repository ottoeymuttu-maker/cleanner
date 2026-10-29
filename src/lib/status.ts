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
  requested: "bg-amber-200",
  quoted: "bg-pink",
  confirmed: "bg-lilac",
  assigned: "bg-sky-200",
  on_the_way: "bg-violet-300",
  in_progress: "bg-cyan-200",
  completed: "bg-orange-200",
  closed: "bg-brand-500",
  cancelled: "bg-neutral-200 text-ink/50",
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
