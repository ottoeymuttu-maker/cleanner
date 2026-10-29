import Link from "next/link";
import { adminApproveStaff, adminRejectStaff } from "@/app/actions";
import { listJobs, listUsers } from "@/lib/db";
import { hoursFor } from "@/lib/timesheet";

const PAY_LABEL = { hourly: "บาท/ชม.", per_job: "บาท/งาน", commission: "% ของยอด", per_service: "" } as const;

export default async function StaffList() {
  const [allStaff, jobs] = await Promise.all([listUsers("staff"), listJobs()]);
  const pending = allStaff.filter((s) => s.staff?.pendingApproval);
  const staff = allStaff.filter((s) => !s.staff?.pendingApproval);
  const unlinked = staff.filter((s) => !s.lineUserId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">พนักงาน / Supplier</h1>
        <Link href="/admin/staff/new" className="btn-primary">+ เพิ่มพนักงาน</Link>
      </div>
      {pending.length > 0 && (
        <section className="card space-y-3 bg-amber-50 ring-amber-200">
          <h2 className="font-semibold text-amber-900">👷 ขอเข้าใช้งานแอปทีมงาน — รออนุมัติ ({pending.length})</h2>
          {pending.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-amber-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.pictureUrl && <img src={p.pictureUrl} alt="" className="h-10 w-10 rounded-full" />}
              <div className="flex-1 text-sm">
                <b>{p.name}</b> <span className="text-ink/60">(ชื่อใน LINE)</span>
              </div>
              <form action={adminApproveStaff.bind(null, p.id)} className="flex flex-wrap items-center gap-2">
                <select name="linkTo" defaultValue="" className="input w-auto">
                  <option value="">อนุมัติเป็นพนักงานใหม่</option>
                  {unlinked.map((s) => (
                    <option key={s.id} value={s.id}>ผูกกับ: {s.name}</option>
                  ))}
                </select>
                <button className="btn-primary">อนุมัติ</button>
              </form>
              <form action={adminRejectStaff.bind(null, p.id)}>
                <button className="btn-danger">ปฏิเสธ</button>
              </form>
            </div>
          ))}
          <p className="text-xs text-amber-800">ถ้าคนนี้มีประวัติพนักงานอยู่แล้ว ให้เลือก “ผูกกับ” ชื่อเดิม เพื่อให้งาน ชั่วโมง และค่าแรงเดิมอยู่บัญชีเดียวกัน</p>
        </section>
      )}
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
                <tr key={s.id} className={`hover:bg-cream ${p.active ? "" : "opacity-50"}`}>
                  <td className="td"><Link href={`/admin/staff/${s.id}`} className="font-semibold text-brand-700 underline">{s.name}</Link><div className="text-xs text-ink/60">{s.phone} {s.lineUserId ? "· ✅ LINE" : "· ยังไม่ผูก LINE"}</div></td>
                  <td className="td">{p.type === "employee" ? "พนักงาน" : `Supplier${p.company ? ` · ${p.company}` : ""}`}</td>
                  <td className="td">{p.skills.map((k) => (k === "aircon" ? "❄️ แอร์" : "🧹 แม่บ้าน")).join(" ")}</td>
                  <td className="td">{p.zone}</td>
                  <td className="td">{p.payModel === "per_service" ? "ตามรายการบริการ" : `${p.rate} ${PAY_LABEL[p.payModel]}`}</td>
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
