// ไม่ตรวจสิทธิ์ที่ layout เพราะหน้า /staff/login ต้องเปิดได้ก่อน login — ทุกหน้าเรียก requireRole เอง
export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return <div className="mx-auto min-h-screen max-w-md bg-cream pb-10 shadow-xl">{children}</div>;
}
