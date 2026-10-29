import { adminSaveService } from "@/app/actions";
import { listServices } from "@/lib/db";
import type { Service } from "@/lib/types";

function Row({ s }: { s?: Service }) {
  return (
    <form action={adminSaveService} className="grid grid-cols-12 items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm">
      <input type="hidden" name="id" value={s?.id ?? ""} />
      <select name="category" defaultValue={s?.category ?? "aircon"} className="input col-span-2">
        <option value="aircon">❄️ แอร์</option>
        <option value="cleaning">🧹 แม่บ้าน</option>
      </select>
      <input name="name" required defaultValue={s?.name} placeholder="ชื่อบริการ" className="input col-span-4" />
      <select name="unit" defaultValue={s?.unit ?? "เครื่อง"} className="input col-span-1">
        <option>เครื่อง</option>
        <option>ชั่วโมง</option>
        <option>ครั้ง</option>
      </select>
      <input name="price" type="number" required defaultValue={s?.price} placeholder="ราคา" className="input col-span-2" />
      <input name="durationMin" type="number" defaultValue={s?.durationMin ?? 60} title="นาที/หน่วย" className="input col-span-1" />
      <label className="col-span-1 text-center"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} /></label>
      <button className={`col-span-1 ${s ? "btn-outline" : "btn-primary"} px-2`}>{s ? "บันทึก" : "เพิ่ม"}</button>
    </form>
  );
}

export default async function Pricing() {
  const services = await listServices();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">บริการและราคา</h1>
      <p className="text-sm text-slate-500">ราคานี้ใช้คำนวณใบเสนอราคาอัตโนมัติเมื่อลูกค้าจองงานมาตรฐาน งานที่ส่งใบเสนอราคาไปแล้วจะไม่เปลี่ยนตาม</p>
      <div className="card overflow-x-auto p-0">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-slate-500">
            <span className="col-span-2">หมวด</span><span className="col-span-4">บริการ</span><span>หน่วย</span>
            <span className="col-span-2">ราคา (บาท)</span><span>นาที/หน่วย</span><span className="text-center">เปิดขาย</span><span />
          </div>
          {services.map((s) => <Row key={s.id} s={s} />)}
          <Row />
        </div>
      </div>
    </div>
  );
}
