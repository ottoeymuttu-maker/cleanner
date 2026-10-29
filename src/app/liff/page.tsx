import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getSettings, listJobs } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDate, fmtDateTime } from "@/lib/status";

const AIRCON_CYCLE_DAYS = 120; // แนะนำล้างแอร์ทุก 4 เดือน

export default async function LiffHome() {
  const user = await requireRole("customer");
  const [settings, jobs] = await Promise.all([getSettings(), listJobs()]);
  const mine = jobs.filter((j) => j.customerId === user.id);
  const active = mine.filter((j) => !["closed", "cancelled"].includes(j.status));

  const lastAircon = mine
    .filter((j) => j.status === "closed" && j.items.some((i) => i.serviceId?.startsWith("ac-")))
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0];
  const dueAt = lastAircon && new Date(new Date(lastAircon.scheduledAt).getTime() + AIRCON_CYCLE_DAYS * 864e5);

  return (
    <>
      <PageHeader title={settings.shopName} />
      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-600">สวัสดี {user.name} 👋</p>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/liff/book?cat=aircon" className="card text-center hover:ring-brand-500">
            <div className="text-4xl">❄️</div>
            <div className="mt-2 font-semibold">ล้างแอร์</div>
            <div className="text-xs text-slate-500">เริ่ม 600 ฿/เครื่อง</div>
          </Link>
          <Link href="/liff/book?cat=cleaning" className="card text-center hover:ring-brand-500">
            <div className="text-4xl">🧹</div>
            <div className="mt-2 font-semibold">แม่บ้าน</div>
            <div className="text-xs text-slate-500">เริ่ม 250 ฿/ชม.</div>
          </Link>
        </div>

        {dueAt && (
          <div className="card bg-sky-50 ring-sky-200">
            <div className="text-sm font-semibold text-sky-900">ถึงรอบล้างแอร์ {dueAt < new Date() ? "แล้ว" : "เร็ว ๆ นี้"}</div>
            <p className="text-xs text-sky-800">ล้างครั้งล่าสุด {fmtDate(lastAircon.scheduledAt)} — แนะนำทุก 4 เดือน</p>
            <Link href="/liff/book?cat=aircon" className="btn-primary mt-2 py-1.5">จองอีกครั้ง</Link>
          </div>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">งานที่กำลังดำเนินการ</h2>
          {active.length === 0 && <p className="text-sm text-slate-400">ไม่มีงานค้าง</p>}
          <div className="space-y-2">
            {active.map((j) => (
              <Link key={j.id} href={`/liff/jobs/${j.id}`} className="card block">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{j.code}</span>
                  <StatusBadge status={j.status} />
                </div>
                <div className="mt-1 text-xs text-slate-500">นัด {fmtDateTime(j.scheduledAt)}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
