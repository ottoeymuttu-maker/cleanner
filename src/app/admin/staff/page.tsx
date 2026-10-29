import Link from "next/link";
import { listJobs, listUsers } from "@/lib/db";
import { hoursFor } from "@/lib/timesheet";

const PAY_LABEL = { hourly: "บาท/ชม.", per_job: "บาท/งาน", commission: "% ของยอด" } as const;

export default async function StaffList() {
  const [staff, jobs] = await Promise.all([listUsers("staff"), listJobs()]);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">พนักงาน / Supplier</h1>
        <Link href="/admin/staff/new" className="btn-primary">+ เพิ่มพนักงาน</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="th">ชื่อ</th>
              <th className="th">ประเภท</th>
              <th className="th">ทักษะ</th>
              <th className="th">พื้นที่</th>
              <th className="th">ค่าตอบแทน</th>
              <th className="th text-right">งานเสร็จ</th>
              <th className="th text-right">ชม. เดือนนี้</th>
              <th className="th text-right">คะแนน</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const p = s.staff!;
              const mine = jobs.filter((j) => j.staffIds.includes(s.id));
              const done = mine.filter((j) => ["completed", "closed"].includes(j.status));
              const rated = mine.filter((j) => j.review);
              const avg = rated.length ? rated.reduce((a, j) => a + j.review!.rating, 0) / rated.length : null;
              return (
                <tr key={s.id} className={`hover:bg-slate-50 ${p.active ? "" : "opacity-50"}`}>
                  <td className="td"><Link href={`/admin/staff/${s.id}`} className="font-semibold text-brand-700 underline">{s.name}</Link><div className="text-xs text-slate-500">{s.phone}</div></td>
                  <td className="td">{p.type === "employee" ? "พนักงาน" : `Supplier${p.company ? ` · ${p.company}` : ""}`}</td>
                  <td className="td">{p.skills.map((k) => (k === "aircon" ? "❄️ แอร์" : "🧹 แม่บ้าน")).join(" ")}</td>
                  <td className="td">{p.zone}</td>
                  <td className="td">{p.rate} {PAY_LABEL[p.payModel]}</td>
                  <td className="td text-right">{done.length}</td>
                  <td className="td text-right">{hoursFor(jobs, s.id, monthStart, new Date()).toFixed(1)}</td>
                  <td className="td text-right">{avg ? `${avg.toFixed(1)} ★` : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
