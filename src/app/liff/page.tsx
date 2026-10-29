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
      <PageHeader title={settings.shopName} logo />
      <div className="space-y-4 p-4">
        <div>
          <p className="text-sm font-medium text-ink/60">สวัสดี 👋</p>
          <h2 className="text-3xl font-black leading-tight">{user.name}</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/liff/book?cat=aircon" className="card relative overflow-hidden bg-sky-200 transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <div className="absolute -right-3 -top-3 rotate-12 text-6xl">❄️</div>
            <div className="mt-12 text-2xl font-black leading-none">ล้างแอร์</div>
            <span className="sticker mt-3 bg-white">เริ่ม 600.-</span>
          </Link>
          <Link href="/liff/book?cat=cleaning" className="card relative overflow-hidden bg-lilac transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <div className="absolute -right-3 -top-3 -rotate-12 text-6xl">🧹</div>
            <div className="mt-12 text-2xl font-black leading-none">แม่บ้าน</div>
            <span className="sticker mt-3 bg-white">เริ่ม 250.-/ชม.</span>
          </Link>
        </div>

        {dueAt && (
          <div className="card bg-pink">
            <div className="text-lg font-black">⏰ ถึงรอบล้างแอร์{dueAt < new Date() ? "แล้ว!" : "เร็ว ๆ นี้"}</div>
            <p className="text-xs font-medium">ล้างครั้งล่าสุด {fmtDate(lastAircon.scheduledAt)} — แนะนำทุก 4 เดือน</p>
            <Link href="/liff/book?cat=aircon" className="btn-dark mt-3 py-1.5">จองอีกครั้ง →</Link>
          </div>
        )}

        <section>
          <h2 className="mb-3 text-lg font-black">งานที่กำลังดำเนินการ</h2>
          {active.length === 0 && <p className="card text-center text-sm text-ink/50">ยังไม่มีงาน กด “จองเลย!” ด้านล่างได้เลย ✨</p>}
          <div className="space-y-2">
            {active.map((j) => (
              <Link key={j.id} href={`/liff/jobs/${j.id}`} className="card block">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold">{j.code}</span>
                  <StatusBadge status={j.status} />
                </div>
                <div className="mt-1 text-xs font-medium text-ink/60">📅 {fmtDateTime(j.scheduledAt)}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
