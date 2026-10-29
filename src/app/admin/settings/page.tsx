import { adminSaveSettings } from "@/app/actions";
import { getSettings } from "@/lib/db";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">ตั้งค่าร้าน</h1>
      <form action={adminSaveSettings} className="card grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">ชื่อร้าน</label><input name="shopName" defaultValue={s.shopName} className="input" /></div>
        <div><label className="label">PromptPay (เบอร์มือถือ / เลขผู้เสียภาษี)</label><input name="promptpayId" defaultValue={s.promptpayId} className="input" /></div>
        <div><label className="label">ค่าเดินทางเริ่มต้น (บาท)</label><input name="travelFeeBase" type="number" defaultValue={s.travelFeeBase} className="input" /></div>
        <div><label className="label">อายุใบเสนอราคา (วัน)</label><input name="quoteValidDays" type="number" defaultValue={s.quoteValidDays} className="input" /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="vatRegistered" defaultChecked={s.vatRegistered} /> จดทะเบียน VAT</label>
        <div className="sm:col-span-2"><button className="btn-primary">บันทึก</button></div>
      </form>
      <div className="card text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-800">การเชื่อมต่อ</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>LINE Messaging API — ใส่ <code>LINE_CHANNEL_ACCESS_TOKEN</code> ใน .env.local เพื่อส่งแจ้งเตือนจริง</li>
          <li>LIFF — <code>LIFF_ID_CUSTOMER</code> / <code>LIFF_ID_STAFF</code> · แอดมินกำหนดด้วย <code>ADMIN_LINE_USER_IDS</code> ใน apphosting.yaml</li>
          <li>Firebase — Firestore + Storage (ตั้งค่าใน apphosting.yaml)</li>
        </ul>
      </div>
    </div>
  );
}
