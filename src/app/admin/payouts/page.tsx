import Link from "next/link";
import { listJobs, listPayouts, listServices, listUsers } from "@/lib/db";
import { PAY_MODEL_LABEL, unpaidLines } from "@/lib/payroll";
import { baht } from "@/lib/pricing";
import { fmtDate } from "@/lib/status";

const PAYOUT_STATUS = {
  pending: ["รอโอน", "bg-amber-100 text-amber-800"],
  paid: ["โอนแล้ว", "bg-emerald-100 text-emerald-800"],
  void: ["ยกเลิก", "bg-slate-200 text-slate-500"],
} as const;

export default async function Payouts() {
  const [staff, jobs, services, payouts] = await Promise.all([listUsers("staff"), listJobs(), listServices(), listPayouts()]);
  const name = (id: string) => staff.find((s) => s.id === id)?.name ?? id;
  const owed = staff
    .map((s) => ({ s, lines: unpaidLines(s, jobs, services) }))
    .filter((r) => r.lines.length);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">จ่ายค่าแรง ช่าง / แม่บ้าน / Supplier</h1>

      <section className="card overflow-x-auto p-0">
        <h2 className="px-4 pt-4 font-semibold">ค้างจ่าย (งานที่เสร็จแล้วแต่ยังไม่ทำรายการจ่าย)</h2>
        <table className="mt-2 w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="th">ชื่อ</th>
              <th className="th">รูปแบบค่าแรง</th>
              <th className="th text-right">จำนวนงาน</th>
              <th className="th text-right">ยอดค่าแรง (ก่อนหักภาษี)</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {owed.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={5}>ไม่มียอดค้างจ่าย</td></tr>
            )}
            {owed.map(({ s, lines }) => (
              <tr key={s.id}>
                <td className="td font-semibold">{s.name}{s.staff!.type === "supplier" && <span className="ml-1 text-xs text-violet-600">Supplier</span>}</td>
                <td className="td text-xs">{PAY_MODEL_LABEL[s.staff!.payModel]}</td>
                <td className="td text-right">{lines.length}</td>
                <td className="td text-right font-semibold">{baht(lines.reduce((a, l) => a + l.amount, 0))}</td>
                <td className="td text-right"><Link href={`/admin/payouts/new?staff=${s.id}`} className="btn-primary py-1.5">ทำรายการจ่าย</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto p-0">
        <h2 className="px-4 pt-4 font-semibold">รายการจ่าย</h2>
        <table className="mt-2 w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="th">เลขที่</th>
              <th className="th">วันที่</th>
              <th className="th">ผู้รับ</th>
              <th className="th text-right">งาน</th>
              <th className="th text-right">ยอดโอนสุทธิ</th>
              <th className="th">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={6}>ยังไม่มีรายการ</td></tr>
            )}
            {payouts.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td"><Link href={`/admin/payouts/${p.id}`} className="font-semibold text-brand-700 underline">{p.code}</Link></td>
                <td className="td">{fmtDate(p.createdAt)}</td>
                <td className="td">{name(p.staffId)}</td>
                <td className="td text-right">{p.lines.length}</td>
                <td className="td text-right">{baht(p.total)}</td>
                <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs ${PAYOUT_STATUS[p.status][1]}`}>{PAYOUT_STATUS[p.status][0]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
