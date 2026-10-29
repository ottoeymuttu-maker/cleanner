import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/ui";
import { listJobs } from "@/lib/db";
import { baht, jobTotals } from "@/lib/pricing";
import { requireRole } from "@/lib/session";
import { fmtDateTime } from "@/lib/status";

export default async function MyJobs() {
  const user = await requireRole("customer");
  const jobs = (await listJobs()).filter((j) => j.customerId === user.id);

  return (
    <>
      <PageHeader title="งานของฉัน" />
      <div className="space-y-2 p-4">
        {jobs.length === 0 && <p className="text-center text-sm text-slate-400">ยังไม่มีงาน</p>}
        {jobs.map((j) => (
          <Link key={j.id} href={`/liff/jobs/${j.id}`} className="card block">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{j.code}</span>
              <StatusBadge status={j.status} />
            </div>
            <div className="mt-1 line-clamp-1 text-sm text-slate-600">
              {j.items.map((i) => i.name).join(", ") || j.note || "รอประเมิน"}
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>นัด {fmtDateTime(j.scheduledAt)}</span>
              {j.items.length > 0 && <span className="font-semibold text-slate-700">{baht(jobTotals(j).total)}</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
