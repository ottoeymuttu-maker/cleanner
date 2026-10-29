import Link from "next/link";
import { logout } from "@/app/actions";
import { getSettings } from "@/lib/db";
import { requireRole } from "@/lib/session";

const NAV = [
  ["/admin", "📊 แดชบอร์ด"],
  ["/admin/jobs", "📋 งานทั้งหมด"],
  ["/admin/staff", "👷 พนักงาน / Supplier"],
  ["/admin/timesheet", "⏱️ ชั่วโมงทำงาน"],
  ["/admin/pricing", "💰 บริการและราคา"],
  ["/admin/settings", "⚙️ ตั้งค่า"],
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("admin");
  const settings = await getSettings();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-slate-900 text-slate-200 md:w-60 md:shrink-0">
        <div className="px-5 py-4 text-lg font-bold text-white">{settings.shopName}</div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 text-sm md:flex-col md:overflow-visible">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2 hover:bg-slate-800">
              {label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="hidden px-6 py-4 text-xs text-slate-400 md:block">
          {user.name} · <button className="underline">ออกจากระบบ</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
