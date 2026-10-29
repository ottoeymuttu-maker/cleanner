import { adminSaveStaff } from "@/app/actions";
import { PAY_MODEL_LABEL } from "@/lib/payroll";
import type { PayModel, Service, User } from "@/lib/types";

export function StaffForm({ user, services }: { user?: User; services: Service[] }) {
  const p = user?.staff;
  return (
    <form action={adminSaveStaff} className="card grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={user?.id ?? ""} />
      <div><label className="label">ชื่อ-สกุล / ชื่อเล่น</label><input name="name" required defaultValue={user?.name} className="input" /></div>
      <div><label className="label">เบอร์โทร</label><input name="phone" required defaultValue={user?.phone} className="input" /></div>
      <div>
        <label className="label">ประเภท</label>
        <select name="type" defaultValue={p?.type ?? "employee"} className="input">
          <option value="employee">พนักงานประจำ</option>
          <option value="supplier">Supplier / ฟรีแลนซ์</option>
        </select>
      </div>
      <div><label className="label">ชื่อบริษัท/ร้าน (Supplier)</label><input name="company" defaultValue={p?.company} className="input" /></div>
      <div>
        <label className="label">ทักษะ</label>
        <div className="flex gap-4 py-2 text-sm">
          <label><input type="checkbox" name="skills" value="aircon" defaultChecked={p?.skills.includes("aircon")} /> ล้างแอร์</label>
          <label><input type="checkbox" name="skills" value="cleaning" defaultChecked={p?.skills.includes("cleaning")} /> แม่บ้าน</label>
        </div>
      </div>
      <div><label className="label">พื้นที่รับงาน</label><input name="zone" defaultValue={p?.zone} className="input" /></div>
      <div>
        <label className="label">รูปแบบค่าตอบแทน</label>
        <select name="payModel" defaultValue={p?.payModel ?? "hourly"} className="input">
          {(Object.keys(PAY_MODEL_LABEL) as PayModel[]).map((m) => (
            <option key={m} value={m}>{PAY_MODEL_LABEL[m]}</option>
          ))}
        </select>
      </div>
      <div><label className="label">อัตรา (ไม่ใช้กับ “ตามรายการบริการ”)</label><input name="rate" type="number" step="0.01" defaultValue={p?.rate} className="input" /></div>
      <div><label className="label">ธนาคาร</label><input name="bankName" defaultValue={p?.bankName} className="input" /></div>
      <div><label className="label">เลขบัญชี (สำหรับโอนค่าแรง)</label><input name="bankAccount" defaultValue={p?.bankAccount} className="input" /></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="withholdingTax" defaultChecked={p?.withholdingTax ?? p?.type === "supplier"} /> หัก ณ ที่จ่าย 3% เมื่อจ่ายค่าแรง (ผู้รับจ้างภายนอก)
      </label>
      <details className="rounded-xl bg-slate-50 p-3 sm:col-span-2" open={p?.payModel === "per_service"}>
        <summary className="cursor-pointer text-sm font-semibold">ค่าแรงต่อหน่วยบริการ (เฉพาะคนนี้) — เว้นว่าง = ใช้ราคามาตรฐาน</summary>
        <table className="mt-2 w-full text-sm">
          <thead><tr><th className="th">บริการ</th><th className="th w-28 text-right">มาตรฐาน</th><th className="th w-36">ราคาเฉพาะคนนี้</th></tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td className="td">{s.name} <span className="text-xs text-slate-400">/{s.unit}</span></td>
                <td className="td text-right text-slate-500">{s.staffPay ?? "-"}</td>
                <td className="td"><input name={"rate_" + s.id} type="number" step="0.01" defaultValue={p?.serviceRates?.[s.id]} className="input" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <div><label className="label">เลขบัตรประชาชน</label><input name="idCardNo" defaultValue={p?.idCardNo} className="input" /></div>
      <div><label className="label">วันที่เริ่มงาน</label><input name="joinedAt" type="date" defaultValue={p?.joinedAt} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">บันทึกเพิ่มเติม (ใบรับรอง, ตรวจประวัติ, อุปกรณ์ที่ถือ)</label><textarea name="notes" rows={2} defaultValue={p?.notes} className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> เปิดรับงาน</label>
      <div className="sm:col-span-2"><button className="btn-primary">บันทึก</button></div>
    </form>
  );
}
