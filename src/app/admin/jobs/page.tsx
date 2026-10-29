import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { listJobs, listUsers } from "@/lib/db";
import { baht, jobTotals } from "@/lib/pricing";
import { STATUS_LABEL, fmtDateTime } from "@/lib/status";
import type { JobStatus } from "@/lib/types";

export default async function AdminJobs(props: PageProps<"/admin/jobs">) {
  const { status } = await props.searchParams;
  const [jobs, users] = await Promise.all([listJobs(), listUsers()]);
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const shown = status ? jobs.filter((j) => j.status === status) : jobs;
  const statuses = Object.keys(STATUS_LABEL) as JobStatus[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">งานทั้งหมด</h1>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href="/admin/jobs" className={`rounded-full px-3 py-1 ring-1 ring-slate-300 ${!status ? "bg-slate-900 text-white" : "bg-white"}`}>
          ทั้งหมด ({jobs.length})
        </Link>
        {statuses.map((s) => {
          const n = jobs.filter((j) => j.status === s).length;
          if (!n) return null;
          return (
            <Link key={s} href={`/admin/jobs?status=${s}`} className={`rounded-full px-3 py-1 ring-1 ring-slate-300 ${status === s ? "bg-slate-900 text-white" : "bg-white"}`}>
              {STATUS_LABEL[s]} ({n})
            </Link>
          );
        })}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="th">รหัส</th>
              <th className="th">วันนัด</th>
              <th className="th">ลูกค้า</th>
              <th className="th">บริการ</th>
              <th className="th">ช่าง</th>
              <th className="th text-right">ยอด</th>
              <th className="th">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="td font-semibold"><Link href={`/admin/jobs/${j.id}`} className="text-brand-700 underline">{j.code}</Link></td>
                <td className="td whitespace-nowrap">{fmtDateTime(j.scheduledAt)}</td>
                <td className="td">{name(j.customerId)}</td>
                <td className="td max-w-xs truncate">{j.items.map((i) => i.name).join(", ") || <i className="text-slate-400">รอประเมิน</i>}</td>
                <td className="td">{j.staffIds.map(name).join(", ") || "-"}</td>
                <td className="td text-right">{j.items.length ? baht(jobTotals(j).total) : "-"}</td>
                <td className="td"><StatusBadge status={j.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
