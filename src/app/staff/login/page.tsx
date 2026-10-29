import { LiffLogin } from "@/components/liff-login";
import { LIFF_IDS } from "@/lib/line-auth";

const safeNext = (v: unknown) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/staff");

export default async function StaffLogin(props: PageProps<"/staff/login">) {
  const { next } = await props.searchParams;
  return <LiffLogin liffId={LIFF_IDS.staff()} role="staff" next={safeNext(next)} />;
}
