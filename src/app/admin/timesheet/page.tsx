import Link from "next/link";
import { listJobs, listUsers } from "@/lib/db";
import { bkkMonth, monthRange, payrollRow } from "@/lib/payroll";
import { baht } from "@/lib/pricing";
import { fmtDateTime } from "@/lib/status";
import { sessionsFor } from "@/lib/timesheet";

const PAY = { hourly: "รายชั่วโมง", per_job: "ต่องาน", commission: "คอมมิชชั่น" } as const;

export default async function Timesheet(props: PageProps<"/admin/timesheet">) {
  const sp = await props.searchParams;
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : bkkMonth(new Date().toISOString());
  const focus = typeof sp.staff === "string" ? sp.staff : undefined;
  const [staff, jobs] = await Promise.all([listUsers("staff"), listJobs()]);
  const rows = staff.map((s) => payrollRow(s, jobs, month));
  const { from, to } = monthRange(month);
  const focusUser = staff.find((s) => s.id === focus);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-bold">ชั่วโมงทำงาน & ค่าตอบแทน</h1>
        <form className="flex items-end gap-2">
          <div><label className="label">เดือน</label><input type="month" name="month" defaultValue={month} className="input" /></div>
          <button className="btn-outline">ดู</button>
          <a href={`/api/timesheet?month=${month}`} className="btn-dark">⬇️ Export CSV</a>
        </form>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="th">พนักงาน</th>
              <th className="th">รูปแบบ</th>
              <th className="th text-right">งานเสร็จ</th>
              <th className="th text-right">ชั่วโมง</th>
              <th className="th text-right">มูลค่างาน</th>
              <th className="th text-right">ค่าตอบแทน (ประมาณ)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.staff.id} className={focus === r.staff.id ? "bg-brand-50" : "hover:bg-slate-50"}>
                <td className="td"><Link href={`?month=${month}&staff=${r.staff.id}`} className="text-brand-700 underline">{r.staff.name}</Link></td>
                <td className="td">{PAY[r.staff.staff!.payModel]} ({r.staff.staff!.rate})</td>
                <td className="td text-right">{r.jobs}</td>
                <td className="td text-right">{r.hours.toFixed(2)}</td>
                <td className="td text-right">{baht(r.jobValue)}</td>
                <td className="td text-right font-semibold">{baht(Math.round(r.pay))}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="td" colSpan={3}>รวม</td>
              <td className="td text-right">{rows.reduce((s, r) => s + r.hours, 0).toFixed(2)}</td>
              <td className="td text-right">{baht(rows.reduce((s, r) => s + r.jobValue, 0))}</td>
              <td className="td text-right">{baht(Math.round(rows.reduce((s, r) => s + r.pay, 0)))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {focusUser && (
        <section className="card">
          <h2 className="mb-3 font-semibold">รายละเอียดการเช็คอิน — {focusUser.name}</h2>
          <table className="w-full text-sm">
            <thead><tr><th className="th">งาน</th><th className="th">เข้า</th><th className="th">ออก</th><th className="th text-right">ชั่วโมง</th></tr></thead>
            <tbody>
              {sessionsFor(jobs, focusUser.id, from, to).map((s, i) => (
                <tr key={i}>
                  <td className="td"><Link href={`/admin/jobs/${s.job.id}`} className="underline">{s.job.code}</Link></td>
                  <td className="td">{fmtDateTime(s.inAt)}</td>
                  <td className="td">{s.outAt ? fmtDateTime(s.outAt) : "ยังไม่เช็คเอาท์"}</td>
                  <td className="td text-right">{s.outAt ? ((new Date(s.outAt).getTime() - new Date(s.inAt).getTime()) / 36e5).toFixed(2) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
