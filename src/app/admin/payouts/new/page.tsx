import { notFound } from "next/navigation";
import { adminCreatePayout } from "@/app/actions";
import { getUser, listJobs, listServices } from "@/lib/db";
import { PAY_MODEL_LABEL, WHT_RATE, unpaidLines } from "@/lib/payroll";
import { baht } from "@/lib/pricing";
import { fmtDate } from "@/lib/status";

export default async function NewPayout(props: PageProps<"/admin/payouts/new">) {
  const { staff: staffId } = await props.searchParams;
  const staff = typeof staffId === "string" ? await getUser(staffId) : undefined;
  if (!staff?.staff) notFound();
  const [jobs, services] = await Promise.all([listJobs(), listServices()]);
  const lines = unpaidLines(staff, jobs, services);
  const gross = lines.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-xl font-bold">ทำรายการจ่าย — {staff.name}</h1>
      <p className="text-sm text-ink/60">
        {PAY_MODEL_LABEL[staff.staff.payModel]} · บัญชี {staff.staff.bankName || "-"} {staff.staff.bankAccount || ""}
      </p>
      <form action={adminCreatePayout.bind(null, staff.id)} className="space-y-4">
        <section className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr><th className="th w-8" /><th className="th">งาน</th><th className="th">วันที่</th><th className="th">คำนวณจาก</th><th className="th text-right">ค่าแรง</th></tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.jobId}>
                  <td className="td"><input type="checkbox" name="jobIds" value={l.jobId} defaultChecked /></td>
                  <td className="td font-semibold">{l.code}</td>
                  <td className="td">{fmtDate(l.date)}</td>
                  <td className="td text-xs text-ink/70">{l.detail}</td>
                  <td className="td text-right">{baht(l.amount)}</td>
                </tr>
              ))}
              <tr className="font-semibold"><td className="td" colSpan={4}>รวมทุกงาน</td><td className="td text-right">{baht(gross)}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="card space-y-2">
          <h2 className="text-sm font-semibold">รายการบวก / หัก (เช่น ค่าเดินทางเพิ่ม +200, หักค่าวัสดุ -150)</h2>
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input name="adjLabel" placeholder="รายละเอียด" className="input col-span-2" />
              <input name="adjAmount" type="number" step="0.01" placeholder="จำนวน (+/-)" className="input" />
            </div>
          ))}
          <label className="flex items-center gap-2 pt-2 text-sm">
            <input type="checkbox" name="withholdingTax" defaultChecked={staff.staff.withholdingTax} /> หัก ณ ที่จ่าย {WHT_RATE * 100}%
          </label>
          <textarea name="note" rows={2} placeholder="หมายเหตุ" className="input" />
        </section>

        <button className="btn-primary" disabled={!lines.length}>สร้างรายการจ่าย</button>
      </form>
    </div>
  );
}
