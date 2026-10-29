import { requireRole } from "@/lib/session";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  await requireRole("staff");
  return <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-10 shadow-xl">{children}</div>;
}
