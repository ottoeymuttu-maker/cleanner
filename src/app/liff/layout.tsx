import Link from "next/link";

// ไม่ตรวจสิทธิ์ที่ layout เพราะหน้า /liff/login ต้องเปิดได้ก่อน login — ทุกหน้าเรียก requireRole เอง
export default function LiffLayout({ children }: LayoutProps<"/liff">) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <div className="flex-1 pb-28">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 mx-auto grid max-w-md grid-cols-3 items-end border-t-[3px] border-ink bg-white px-4 pb-3 pt-2 text-center text-xs font-bold">
        <Link href="/liff" className="py-1">
          <div className="text-xl">🏠</div>หน้าแรก
        </Link>
        <Link href="/liff/book" className="-mt-8 flex flex-col items-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-ink bg-brand-500 text-4xl font-black leading-none shadow-[3px_3px_0_#111]">
            +
          </span>
          <span className="mt-1">จองเลย!</span>
        </Link>
        <Link href="/liff/jobs" className="py-1">
          <div className="text-xl">📋</div>งานของฉัน
        </Link>
      </nav>
    </div>
  );
}
