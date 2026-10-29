"use client";

import { useState } from "react";
import { adminSaveQuote } from "@/app/actions";
import { baht } from "@/lib/pricing";
import type { Job, JobItem, Service } from "@/lib/types";

export function QuoteEditor({ job, services, canResend }: { job: Job; services: Service[]; canResend: boolean }) {
  const [items, setItems] = useState<JobItem[]>(job.items);
  const [travel, setTravel] = useState(job.travelFee);
  const [discount, setDiscount] = useState(job.discount);
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const set = (idx: number, patch: Partial<JobItem>) => setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const addService = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (s) setItems((xs) => [...xs, { serviceId: s.id, name: s.name, qty: 1, unitPrice: s.price }]);
  };

  return (
    <form action={adminSaveQuote.bind(null, job.id)} className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="th">รายการ</th>
            <th className="th w-20">จำนวน</th>
            <th className="th w-28">ราคา/หน่วย</th>
            <th className="th w-24 text-right">รวม</th>
            <th className="th w-8" />
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx}>
              <td className="td">
                <input type="hidden" name="itemServiceId" value={it.serviceId ?? ""} />
                <input name="itemName" value={it.name} onChange={(e) => set(idx, { name: e.target.value })} className="input" />
              </td>
              <td className="td"><input name="itemQty" type="number" min={0} value={it.qty} onChange={(e) => set(idx, { qty: +e.target.value })} className="input" /></td>
              <td className="td"><input name="itemPrice" type="number" min={0} value={it.unitPrice} onChange={(e) => set(idx, { unitPrice: +e.target.value })} className="input" /></td>
              <td className="td text-right">{baht(it.qty * it.unitPrice)}</td>
              <td className="td"><button type="button" onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))} className="text-rose-500">✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2">
        <select onChange={(e) => { addService(e.target.value); e.target.value = ""; }} defaultValue="" className="input w-auto">
          <option value="" disabled>+ เพิ่มจากรายการบริการ</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({baht(s.price)})</option>)}
        </select>
        <button type="button" onClick={() => setItems((xs) => [...xs, { serviceId: null, name: "", qty: 1, unitPrice: 0 }])} className="btn-outline">
          + รายการพิเศษ
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><label className="label">ค่าเดินทาง</label><input name="travelFee" type="number" value={travel} onChange={(e) => setTravel(+e.target.value)} className="input" /></div>
        <div><label className="label">ส่วนลด</label><input name="discount" type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} className="input" /></div>
        <div className="col-span-2 self-end text-right">
          <div className="text-xs text-slate-500">ยอดสุทธิ</div>
          <div className="text-xl font-bold">{baht(Math.max(0, subtotal + travel - discount))}</div>
        </div>
      </div>
      <button className="btn-primary">{canResend ? "💾 บันทึกและส่งใบเสนอราคาให้ลูกค้า" : "💾 บันทึกการแก้ไขราคา"}</button>
    </form>
  );
}
