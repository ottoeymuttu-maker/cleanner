import Link from "next/link";
import { logout } from "@/app/actions";
import { PageHeader, StatusBadge } from "@/components/ui";
import { listJobs } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDateTime } from "@/lib/status";
import { hoursFor } from "@/lib/timesheet";

export default async function StaffHome() {
  const user = await requireRole("staff");
  const jobs = (await listJobs()).filter((j) => j.staffIds.includes(user.id) && j.status !== "cancelled");
  const open = jobs.filter((j) => !["completed", "closed"].includes(j.status)).reverse();
  const done = jobs.filter((j) => ["completed", "closed"].includes(j.status));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const hours = hoursFor(jobs, user.id, monthStart, new Date());

  return (
    <>
      <PageHeader
        title={`งานของ ${user.name}`}
        right={
          <form action={logout}>
            <button className="text-xs underline">ออก</button>
          </form>
        }
      />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="card p-3"><div className="text-xl font-bold">{open.length}</div><div className="text-xs text-slate-500">งานรอทำ</div></div>
          <div className="card p-3"><div className="text-xl font-bold">{done.length}</div><div className="text-xs text-slate-500">งานเสร็จ</div></div>
          <div className="card p-3"><div className="text-xl font-bold">{hours.toFixed(1)}</div><div className="text-xs text-slate-500">ชม. เดือนนี้</div></div>
        </div>

        <h2 className="text-sm font-semibold text-slate-700">คิวงาน</h2>
        {open.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีงานที่ได้รับมอบหมาย</p>}
        {open.map((j) => (
          <Link key={j.id} href={`/staff/jobs/${j.id}`} className="card block">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{fmtDateTime(j.scheduledAt)}</span>
              <StatusBadge status={j.status} />
            </div>
            <div className="mt-1 text-sm">{j.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
            <div className="mt-1 text-xs text-slate-500">📍 {j.address}</div>
          </Link>
        ))}

        {done.length > 0 && (
          <>
            <h2 className="pt-2 text-sm font-semibold text-slate-700">งานที่เสร็จแล้ว</h2>
            {done.map((j) => (
              <Link key={j.id} href={`/staff/jobs/${j.id}`} className="card flex items-center justify-between py-3 text-sm">
                <span>{j.code} · {fmtDateTime(j.scheduledAt)}</span>
                <StatusBadge status={j.status} />
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  );
}
