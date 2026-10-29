import { adminSaveStaff } from "@/app/actions";
import type { User } from "@/lib/types";

export function StaffForm({ user }: { user?: User }) {
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
          <option value="hourly">รายชั่วโมง (บาท/ชม.)</option>
          <option value="per_job">ต่องาน (บาท/งาน)</option>
          <option value="commission">ค่าคอมมิชชั่น (% ของยอดงาน)</option>
        </select>
      </div>
      <div><label className="label">อัตรา</label><input name="rate" type="number" step="0.01" defaultValue={p?.rate} className="input" /></div>
      <div><label className="label">เลขบัตรประชาชน</label><input name="idCardNo" defaultValue={p?.idCardNo} className="input" /></div>
      <div><label className="label">วันที่เริ่มงาน</label><input name="joinedAt" type="date" defaultValue={p?.joinedAt} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">บันทึกเพิ่มเติม (ใบรับรอง, ตรวจประวัติ, อุปกรณ์ที่ถือ)</label><textarea name="notes" rows={2} defaultValue={p?.notes} className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> เปิดรับงาน</label>
      <div className="sm:col-span-2"><button className="btn-primary">บันทึก</button></div>
    </form>
  );
}
