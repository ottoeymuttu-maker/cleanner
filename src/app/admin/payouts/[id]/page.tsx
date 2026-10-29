import Link from "next/link";
import { notFound } from "next/navigation";
import { adminMarkPayoutPaid, adminVoidPayout } from "@/app/actions";
import { getPayout, getSettings, getUser } from "@/lib/db";
import { baht } from "@/lib/pricing";
import { fmtDate, fmtDateTime } from "@/lib/status";

export default async function PayoutDetail(props: PageProps<"/admin/payouts/[id]">) {
  const { id } = await props.params;
  const payout = await getPayout(id);
  if (!payout) notFound();
  const [staff, settings] = await Promise.all([getUser(payout.staffId), getSettings()]);
  const linesTotal = payout.lines.reduce((s, l) => s + l.amount, 0);
  const gross = linesTotal + payout.adjustments.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/payouts" className="text-sm text-brand-700 underline">‹ กลับ</Link>

      <section className="card space-y-4 print:shadow-none print:ring-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs text-slate-500">{settings.shopName}</div>
            <h1 className="text-xl font-bold">ใบสรุปค่าแรง {payout.code}</h1>
            <div className="text-sm text-slate-500">ออกเมื่อ {fmtDateTime(payout.createdAt)}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{staff?.name}</div>
            {staff?.staff?.company && <div>{staff.staff.company}</div>}
            <div>{staff?.staff?.bankName} {staff?.staff?.bankAccount}</div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead><tr><th className="th">งาน</th><th className="th">วันที่</th><th className="th">รายละเอียด</th><th className="th text-right">จำนวนเงิน</th></tr></thead>
          <tbody>
            {payout.lines.map((l) => (
              <tr key={l.jobId}>
                <td className="td"><Link href={`/admin/jobs/${l.jobId}`} className="underline">{l.code}</Link></td>
                <td className="td">{fmtDate(l.date)}</td>
                <td className="td text-xs text-slate-600">{l.detail}</td>
                <td className="td text-right">{baht(l.amount)}</td>
              </tr>
            ))}
            {payout.adjustments.map((a, i) => (
              <tr key={i} className={a.amount < 0 ? "text-rose-600" : ""}>
                <td className="td" colSpan={3}>{a.label}</td>
                <td className="td text-right">{baht(a.amount)}</td>
              </tr>
            ))}
            <tr><td className="td" colSpan={3}>รวมก่อนหักภาษี</td><td className="td text-right">{baht(gross)}</td></tr>
            {payout.withholdingTax > 0 && (
              <tr className="text-rose-600"><td className="td" colSpan={3}>หัก ณ ที่จ่าย 3%</td><td className="td text-right">-{baht(payout.withholdingTax)}</td></tr>
            )}
            <tr className="text-base font-bold"><td className="td" colSpan={3}>ยอดโอนสุทธิ</td><td className="td text-right">{baht(payout.total)}</td></tr>
          </tbody>
        </table>
        {payout.note && <p className="text-sm text-slate-600">หมายเหตุ: {payout.note}</p>}
        {payout.status === "paid" && (
          <p className="text-sm text-emerald-700">✓ โอนแล้วเมื่อ {fmtDateTime(payout.paidAt!)} {payout.paidRef && `· อ้างอิง ${payout.paidRef}`}</p>
        )}
        {payout.status === "void" && <p className="text-sm text-slate-500">รายการนี้ถูกยกเลิก งานกลับไปอยู่ในรายการค้างจ่าย</p>}
      </section>

      {payout.status === "pending" && (
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <form action={adminMarkPayoutPaid.bind(null, payout.id)} className="flex items-end gap-2">
            <div><label className="label">เลขอ้างอิงการโอน</label><input name="paidRef" className="input" /></div>
            <button className="btn-primary">ยืนยันโอนแล้ว</button>
          </form>
          <form action={adminVoidPayout.bind(null, payout.id)}>
            <button className="btn-danger">ยกเลิกรายการ</button>
          </form>
        </div>
      )}
    </div>
  );
}
