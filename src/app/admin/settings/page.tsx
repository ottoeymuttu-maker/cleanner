import { adminApproveAdmin, adminRemoveAdmin, adminSaveSettings } from "@/app/actions";
import { getSettings, listUsers } from "@/lib/db";
import { adminLineIds } from "@/lib/line-auth";
import { currentUser } from "@/lib/session";

export default async function SettingsPage() {
  const [s, admins, me] = await Promise.all([getSettings(), listUsers("admin"), currentUser()]);
  const owners = adminLineIds();
  const adminUrl = process.env.NODE_ENV === "production" ? "https://cleanner--cleannerproject.asia-southeast1.hosted.app/admin" : "/admin";
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
      <section className="card space-y-3 text-sm">
        <h2 className="font-semibold">ผู้ดูแลระบบ (แอดมิน)</h2>
        <p className="text-ink/60">
          เพิ่มแอดมิน: ส่งลิงก์ <code className="break-all">{adminUrl}</code> ให้คนนั้นเปิดแล้ว login ด้วย LINE คำขอจะขึ้นที่นี่ให้กดอนุมัติ
        </p>
        <ul className="divide-y divide-ink/10">
          {admins.map((a) => {
            const owner = !!a.lineUserId && owners.includes(a.lineUserId);
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.pictureUrl ? <img src={a.pictureUrl} alt="" className="h-8 w-8 rounded-full" /> : <span className="h-8 w-8 rounded-full bg-cream" />}
                <span className="flex-1">
                  <b>{a.name}</b>
                  {a.id === me?.id && <span className="ml-1 text-xs text-ink/60">(คุณ)</span>}
                  {owner && <span className="ml-1 rounded-full bg-ink px-2 py-0.5 text-xs text-white">เจ้าของระบบ</span>}
                  {a.pendingAdmin && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">รออนุมัติ</span>}
                  {!a.lineUserId && <span className="ml-1 text-xs text-ink/40">(บัญชีทดลอง ไม่มี LINE)</span>}
                </span>
                {a.pendingAdmin && (
                  <form action={adminApproveAdmin.bind(null, a.id)}>
                    <button className="btn-primary py-1.5">อนุมัติ</button>
                  </form>
                )}
                {!owner && a.id !== me?.id && (
                  <form action={adminRemoveAdmin.bind(null, a.id)}>
                    <button className="btn-danger py-1.5">{a.pendingAdmin ? "ปฏิเสธ" : "ถอนสิทธิ์"}</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="card text-sm text-ink/70">
        <h2 className="mb-2 font-semibold text-ink">การเชื่อมต่อ</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>LINE Messaging API — ใส่ <code>LINE_CHANNEL_ACCESS_TOKEN</code> ใน .env.local เพื่อส่งแจ้งเตือนจริง</li>
          <li>LIFF — <code>LIFF_ID_CUSTOMER</code> / <code>LIFF_ID_STAFF</code> · แอดมินกำหนดด้วย <code>ADMIN_LINE_USER_IDS</code> ใน apphosting.yaml</li>
          <li>Firebase — Firestore + Storage (ตั้งค่าใน apphosting.yaml)</li>
        </ul>
      </div>
    </div>
  );
}
