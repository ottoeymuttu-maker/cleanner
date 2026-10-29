import Link from "next/link";
import { Stars, StatusBadge } from "@/components/ui";
import { listJobs, listUsers } from "@/lib/db";
import { baht, jobTotals } from "@/lib/pricing";
import { TZ, fmtDateTime } from "@/lib/status";

const bkkDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });

export default async function Dashboard() {
  const [jobs, users] = await Promise.all([listJobs(), listUsers()]);
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const today = bkkDay(new Date().toISOString());
  const month = today.slice(0, 7);

  const todayJobs = jobs.filter((j) => bkkDay(j.scheduledAt) === today && j.status !== "cancelled");
  const addOnPending = (j: (typeof jobs)[number]) => (j.addOns ?? []).some((a) => a.status === "requested");
  const needAction = jobs.filter(
    (j) => j.status === "requested" || j.status === "confirmed" || (j.payment && !j.payment.verified) || addOnPending(j),
  );
  const revenue = jobs
    .filter((j) => j.payment?.verified && bkkDay(j.payment.paidAt).startsWith(month))
    .reduce((s, j) => s + j.payment!.amount, 0);
  const pipeline = jobs
    .filter((j) => !["closed", "cancelled", "requested"].includes(j.status) && !j.payment)
    .reduce((s, j) => s + jobTotals(j).total, 0);
  const reviews = jobs.filter((j) => j.review);
  const avg = reviews.length ? reviews.reduce((s, j) => s + j.review!.rating, 0) / reviews.length : 0;

  const kpis = [
    ["รายรับเดือนนี้ (ยืนยันแล้ว)", baht(revenue)],
    ["ยอดงานรอเก็บเงิน", baht(pipeline)],
    ["งานวันนี้", String(todayJobs.length)],
    ["คะแนนเฉลี่ย", reviews.length ? `${avg.toFixed(1)} ★ (${reviews.length})` : "-"],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">แดชบอร์ด</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="card">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">⚡ ต้องดำเนินการ ({needAction.length})</h2>
          {needAction.length === 0 && <p className="text-sm text-slate-400">ไม่มี</p>}
          <ul className="divide-y divide-slate-100 text-sm">
            {needAction.map((j) => (
              <li key={j.id}>
                <Link href={`/admin/jobs/${j.id}`} className="flex items-center justify-between py-2 hover:bg-slate-50">
                  <span>
                    <b>{j.code}</b> · {name(j.customerId)}
                    <span className="ml-2 text-xs text-slate-500">
                      {addOnPending(j) ? "ตีราคางานเพิ่มหน้างาน" : j.status === "requested" ? "ต้องตีราคา" : j.status === "confirmed" ? "ต้องจัดช่าง" : "ตรวจสอบการโอน"}
                    </span>
                  </span>
                  <StatusBadge status={j.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold">📅 งานวันนี้</h2>
          {todayJobs.length === 0 && <p className="text-sm text-slate-400">ไม่มีงาน</p>}
          <ul className="divide-y divide-slate-100 text-sm">
            {todayJobs.map((j) => (
              <li key={j.id}>
                <Link href={`/admin/jobs/${j.id}`} className="flex items-center justify-between py-2 hover:bg-slate-50">
                  <span>
                    {fmtDateTime(j.scheduledAt).split(" ").pop()} · <b>{j.code}</b> · {j.staffIds.map(name).join(", ") || "ยังไม่จัดช่าง"}
                  </span>
                  <StatusBadge status={j.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">💬 รีวิวล่าสุด</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {reviews.slice(0, 5).map((j) => (
              <li key={j.id} className="py-2">
                <Stars rating={j.review!.rating} /> <b>{j.code}</b> · {name(j.customerId)} → {j.staffIds.map(name).join(", ")}
                {j.review!.comment && <div className="text-slate-600">“{j.review!.comment}”</div>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
