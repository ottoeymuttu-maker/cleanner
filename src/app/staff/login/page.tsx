import { LiffLogin } from "@/components/liff-login";
import { LIFF_IDS } from "@/lib/line-auth";

const safeNext = (v: unknown, fallback: string) =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : fallback;

// ใช้ทั้งช่าง/แม่บ้าน และแอดมิน (?as=admin) — อยู่ใต้ Endpoint ของ LIFF ทีมงาน
export default async function StaffLogin(props: PageProps<"/staff/login">) {
  const { next, as } = await props.searchParams;
  const role = as === "admin" ? "admin" : "staff";
  return <LiffLogin liffId={LIFF_IDS.staff()} role={role} next={safeNext(next, role === "admin" ? "/admin" : "/staff")} />;
}
