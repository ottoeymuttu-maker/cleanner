import { loginAs, logout } from "./actions";
import { getSettings, listUsers } from "@/lib/db";
import { currentUser, demoLoginEnabled } from "@/lib/session";

const ROLE_INFO = {
  customer: { title: "ลูกค้า (LIFF บน LINE)", desc: "จองบริการ ใบเสนอราคา จ่ายเงิน ติดตามงาน รีวิว" },
  staff: { title: "ช่างแอร์ / แม่บ้าน (LIFF)", desc: "รับงาน เช็คอิน GPS ถ่ายรูป ปิดงาน" },
  admin: { title: "หลังบ้าน (Web Admin)", desc: "จ่ายงาน ราคา พนักงาน สรุปชั่วโมง" },
} as const;

export default async function Home(props: PageProps<"/">) {
  const { need } = await props.searchParams;
  const [settings, me] = await Promise.all([getSettings(), currentUser()]);
  if (!demoLoginEnabled()) {
    const oa = process.env.LINE_OA_BASIC_ID;
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-wordmark.png" alt={settings.shopName} className="mx-auto w-72" />
        <p className="mt-6 text-lg font-bold">ล้างแอร์ · แม่บ้าน · จองผ่าน LINE ✨</p>
        {oa && (
          <a href={`https://line.me/R/ti/p/${oa}`} className="btn-primary mt-8 px-6 py-3 text-base">
            เพิ่มเพื่อน LINE {oa}
          </a>
        )}
      </main>
    );
  }
  const users = await listUsers();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">{settings.shopName}</h1>
      <p className="mt-1 text-sm text-ink/60">
        โหมดทดลอง — เลือกผู้ใช้เพื่อจำลองการ login ด้วย LINE (เมื่อเชื่อม LINE จริง หน้านี้จะถูกแทนด้วย LIFF login อัตโนมัติ)
      </p>
      {need && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">กรุณาเลือกผู้ใช้ประเภท “{need}” เพื่อเข้าหน้านั้น</p>
      )}
      {me && (
        <form action={logout} className="mt-4 flex items-center gap-3 text-sm">
          <span>
            กำลังใช้งานเป็น <b>{me.name}</b>
          </span>
          <button className="btn-outline py-1">ออกจากระบบ</button>
        </form>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {(Object.keys(ROLE_INFO) as (keyof typeof ROLE_INFO)[]).map((role) => (
          <section key={role} className="card">
            <h2 className="font-semibold">{ROLE_INFO[role].title}</h2>
            <p className="mb-3 text-xs text-ink/60">{ROLE_INFO[role].desc}</p>
            <div className="space-y-2">
              {users
                .filter((u) => u.role === role)
                .map((u) => (
                  <form key={u.id} action={loginAs}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className={role === "admin" ? "btn-dark w-full" : "btn-primary w-full"}>{u.name}</button>
                  </form>
                ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
