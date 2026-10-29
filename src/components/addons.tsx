import { customerDecideAddOn, requestAddOn } from "@/app/actions";
import { baht } from "@/lib/pricing";
import type { AddOn, Job, Service } from "@/lib/types";

const LABEL: Record<AddOn["status"], string> = {
  requested: "⏳ รอร้านตีราคา",
  quoted: "📨 รอลูกค้ายืนยัน",
  accepted: "✅ ลูกค้ายืนยันแล้ว",
  rejected: "✕ ไม่รับ",
};

/** ฟอร์มขอเพิ่มงาน/ขยายเวลา ใช้ได้ทั้งฝั่งทีมหน้างานและลูกค้า */
export function AddOnRequestForm({ job, services }: { job: Job; services: Service[] }) {
  return (
    <details className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
      <summary className="cursor-pointer text-sm font-semibold text-amber-900">➕ ขอเพิ่มงาน / ขยายเวลา</summary>
      <form action={requestAddOn.bind(null, job.id)} className="mt-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <select name="serviceId" defaultValue="" className="input col-span-2">
            <option value="">— เลือกบริการที่ต้องการเพิ่ม —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({baht(s.price)}/{s.unit})</option>
            ))}
          </select>
          <input name="qty" type="number" min={0} step="0.5" defaultValue={1} className="input" aria-label="จำนวน" />
        </div>
        <textarea name="reason" rows={2} placeholder="เช่น หน้างานมีแอร์ 3 เครื่อง ลูกค้าอยากล้างเพิ่ม 1 / ทำไม่ทันขอเพิ่ม 1 ชม." className="input" />
        <button className="btn-dark w-full">ส่งคำขอให้ร้านตีราคา</button>
        <p className="text-xs text-amber-800">ทีมต้องรอให้ร้านส่งราคาและลูกค้ายืนยันก่อน จึงจะทำงานเพิ่มได้</p>
      </form>
    </details>
  );
}

export function AddOnList({ job, customerView }: { job: Job; customerView?: boolean }) {
  const list = job.addOns ?? [];
  if (!list.length) return null;
  return (
    <div className="space-y-2">
      {list.map((a) => {
        const total = a.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        return (
          <div key={a.id} className={`rounded-xl p-3 text-sm ring-1 ${a.status === "quoted" ? "bg-orange-50 ring-orange-200" : "ring-slate-200"}`}>
            <div className="flex justify-between font-medium">
              <span>{LABEL[a.status]}</span>
              {a.status !== "requested" && <span>{baht(total)}</span>}
            </div>
            {a.reason && <div className="text-xs text-slate-500">“{a.reason}”</div>}
            {a.items.map((i, k) => (
              <div key={k} className="text-xs text-slate-600">
                {i.name} × {i.qty}{a.status !== "requested" && ` = ${baht(i.qty * i.unitPrice)}`}
              </div>
            ))}
            {customerView && a.status === "quoted" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <form action={customerDecideAddOn.bind(null, job.id, a.id, true)}>
                  <button className="btn-primary w-full">ยืนยันงานเพิ่ม</button>
                </form>
                <form action={customerDecideAddOn.bind(null, job.id, a.id, false)}>
                  <button className="btn-outline w-full">ไม่รับ</button>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
