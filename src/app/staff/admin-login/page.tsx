import { LiffLogin } from "@/components/liff-login";
import { LIFF_IDS } from "@/lib/line-auth";

const safeNext = (v: unknown) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/admin");

// login แอดมิน — อยู่ใต้ Endpoint ของ LIFF ทีมงาน (/staff) แต่เป็นคนละหน้ากับช่าง เพื่อให้ role ชัดเจนเสมอ
export default async function AdminLogin(props: PageProps<"/staff/admin-login">) {
  const { next } = await props.searchParams;
  return <LiffLogin liffId={LIFF_IDS.staff()} role="admin" next={safeNext(next)} />;
}
