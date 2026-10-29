"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createBooking } from "@/app/actions";
import { baht } from "@/lib/pricing";
import type { Service, ServiceCategory } from "@/lib/types";

function defaultSlot() {
  const d = new Date(Date.now() + 864e5);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

export default function BookingForm(props: {
  category: ServiceCategory;
  services: Service[];
  travelFee: number;
  defaultAddress: string;
  defaultPhone: string;
}) {
  const list = props.services.filter((s) => s.category === props.category);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [survey, setSurvey] = useState(false);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [pending, setPending] = useState(false);

  const subtotal = useMemo(() => list.reduce((s, x) => s + (qty[x.id] ?? 0) * x.price, 0), [list, qty]);
  const hasItems = subtotal > 0;
  const bump = (id: string, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + d) }));

  const pinLocation = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => alert("ไม่สามารถอ่านตำแหน่งได้"),
    );

  return (
    <form action={createBooking} onSubmit={() => setPending(true)} className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-200 p-1 text-sm font-medium">
        {(["aircon", "cleaning"] as const).map((c) => (
          <Link
            key={c}
            href={`/liff/book?cat=${c}`}
            className={`rounded-lg py-2 text-center ${props.category === c ? "bg-white shadow" : "text-slate-500"}`}
          >
            {c === "aircon" ? "❄️ ล้างแอร์" : "🧹 แม่บ้าน"}
          </Link>
        ))}
      </div>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold">เลือกบริการ</h2>
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <div className="flex-1 text-sm">
              {s.name}
              <div className="text-xs text-slate-500">
                {baht(s.price)} / {s.unit}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => bump(s.id, -1)} className="h-8 w-8 rounded-full bg-slate-100 text-lg">−</button>
              <span className="w-5 text-center text-sm font-semibold">{qty[s.id] ?? 0}</span>
              <button type="button" onClick={() => bump(s.id, 1)} className="h-8 w-8 rounded-full bg-brand-500 text-lg text-white">+</button>
              <input type="hidden" name={"qty_" + s.id} value={qty[s.id] ?? 0} />
            </div>
          </div>
        ))}
        <label className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm">
          <input type="checkbox" name="needsSurvey" checked={survey} onChange={(e) => setSurvey(e.target.checked)} />
          ไม่แน่ใจ / งานพิเศษ — ให้ร้านประเมินราคาก่อน
        </label>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold">วันเวลาและสถานที่</h2>
        <div>
          <label className="label">วันและเวลาที่สะดวก</label>
          <input type="datetime-local" name="scheduledAt" required defaultValue={defaultSlot()} className="input" />
        </div>
        <div>
          <label className="label">เบอร์โทรติดต่อ</label>
          <input name="phone" type="tel" required pattern="[0-9+\- ]{9,15}" defaultValue={props.defaultPhone} className="input" />
        </div>
        <div>
          <label className="label">ที่อยู่</label>
          <textarea name="address" required rows={2} defaultValue={props.defaultAddress} className="input" />
          <button type="button" onClick={pinLocation} className="mt-2 text-xs font-medium text-brand-600">
            📍 {loc ? `ปักหมุดแล้ว (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})` : "ใช้ตำแหน่งปัจจุบัน"}
          </button>
          <input type="hidden" name="lat" value={loc?.lat ?? ""} />
          <input type="hidden" name="lng" value={loc?.lng ?? ""} />
        </div>
        <div>
          <label className="label">รายละเอียดเพิ่มเติม (ยี่ห้อแอร์, ที่จอดรถ, สัตว์เลี้ยง ฯลฯ)</label>
          <textarea name="note" rows={2} className="input" />
        </div>
      </section>

      <div className="card sticky bottom-20 flex items-center justify-between">
        <div className="text-sm">
          {hasItems && !survey ? (
            <>
              <div className="text-xs text-slate-500">ราคาประมาณ (รวมค่าเดินทาง {baht(props.travelFee)})</div>
              <div className="text-lg font-bold">{baht(subtotal + props.travelFee)}</div>
            </>
          ) : (
            <div className="text-slate-500">ร้านจะส่งใบเสนอราคาให้ทาง LINE</div>
          )}
        </div>
        <button disabled={pending || (!hasItems && !survey)} className="btn-primary">
          {pending ? "กำลังส่ง…" : hasItems && !survey ? "ขอใบเสนอราคา" : "ส่งคำขอ"}
        </button>
      </div>
    </form>
  );
}
