import { LiffLogin } from "@/components/liff-login";
import { LIFF_IDS } from "@/lib/line-auth";

const safeNext = (v: unknown, fallback: string) =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : fallback;

export default async function CustomerLogin(props: PageProps<"/liff/login">) {
  const { next } = await props.searchParams;
  return <LiffLogin liffId={LIFF_IDS.customer()} role="customer" next={safeNext(next, "/liff")} />;
}
