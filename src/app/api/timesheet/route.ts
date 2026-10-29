import { listJobs, listServices, listUsers } from "@/lib/db";
import { bkkMonth, payrollRow } from "@/lib/payroll";
import { currentUser } from "@/lib/session";

export async function GET(req: Request) {
  if ((await currentUser())?.role !== "admin") return new Response("Forbidden", { status: 403 });
  const param = new URL(req.url).searchParams.get("month") ?? "";
  const month = /^\d{4}-\d{2}$/.test(param) ? param : bkkMonth(new Date().toISOString());
  const [staff, jobs, services] = await Promise.all([listUsers("staff"), listJobs(), listServices()]);

  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    ["รหัส", "ชื่อ", "ประเภท", "รูปแบบค่าตอบแทน", "อัตรา", "งานเสร็จ", "ชั่วโมง", "มูลค่างาน", "ค่าตอบแทน"].map(esc).join(","),
    ...staff.map((s) => {
      const r = payrollRow(s, jobs, services, month);
      const p = s.staff!;
      return [s.id, s.name, p.type, p.payModel, p.rate, r.jobs, r.hours.toFixed(2), r.jobValue.toFixed(2), r.pay.toFixed(2)].map(esc).join(",");
    }),
  ];
  // BOM ให้ Excel อ่านภาษาไทยถูก
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="timesheet-${month}.csv"`,
    },
  });
}
