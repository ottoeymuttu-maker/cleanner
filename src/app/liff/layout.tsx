import Link from "next/link";
import { requireRole } from "@/lib/session";

export default async function LiffLayout({ children }: LayoutProps<"/liff">) {
  await requireRole("customer");
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 shadow-xl">
      <div className="flex-1 pb-20">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 mx-auto grid max-w-md grid-cols-3 border-t border-slate-200 bg-white text-center text-xs">
        <Link href="/liff" className="py-3">🏠<div>หน้าแรก</div></Link>
        <Link href="/liff/book" className="py-3 font-semibold text-brand-600">➕<div>จองบริการ</div></Link>
        <Link href="/liff/jobs" className="py-3">📋<div>งานของฉัน</div></Link>
      </nav>
    </div>
  );
}
