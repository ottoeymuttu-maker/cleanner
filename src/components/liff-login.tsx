"use client";

import { useEffect, useState } from "react";
import { liffLogin } from "@/app/actions";

type Role = "customer" | "staff" | "admin";
type State =
  | { kind: "loading" }
  | { kind: "pending" }
  | { kind: "not_admin"; lineUserId: string }
  | { kind: "error"; message: string };

const RETRY_KEY = "liff-relogin";
const STATE_KEY = "liff-login-target";

/** เปิดจาก LINE จะ login อัตโนมัติ เปิดจากเบราว์เซอร์ทั่วไปจะพาไปหน้า login ของ LINE */
export function LiffLogin({ liffId, role, next }: { liffId: string; role: Role; next: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      // LINE ตรวจที่อยู่กลับหลัง login แบบตรงตัว จึงใช้ path ล้วน (ไม่มี ?query) และจำหน้าที่จะไปต่อไว้ในเบราว์เซอร์
      // role ผูกกับ path ของหน้า login เสมอ (/liff/login, /staff/login, /staff/admin-login)
      const key = `${STATE_KEY}:${role}`;
      if (new URLSearchParams(location.search).has("next")) sessionStorage.setItem(key, next);
      const target = { role, next: sessionStorage.getItem(key) ?? next };
      const redirectUri = location.origin + location.pathname;

      const { default: liff } = await import("@line/liff");
      await liff.init({ liffId });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri });
        return;
      }
      const idToken = liff.getIDToken();
      const result = idToken ? await liffLogin(idToken, target.role) : { ok: false as const, reason: "error" as const, message: "ไม่ได้รับ ID token" };
      if (result.ok) {
        sessionStorage.removeItem(RETRY_KEY);
        sessionStorage.removeItem(key);
        location.replace(target.next);
        return;
      }
      // token ที่เบราว์เซอร์จำไว้หมดอายุ: ออกแล้ว login ใหม่ 1 ครั้ง
      if (result.reason === "error" && !sessionStorage.getItem(RETRY_KEY)) {
        sessionStorage.setItem(RETRY_KEY, "1");
        liff.logout();
        liff.login({ redirectUri });
        return;
      }
      if (result.reason === "pending") setState({ kind: "pending" });
      else if (result.reason === "not_admin") setState({ kind: "not_admin", lineUserId: result.lineUserId ?? "" });
      else setState({ kind: "error", message: result.message ?? "เข้าสู่ระบบไม่สำเร็จ" });
    })().catch((e) => setState({ kind: "error", message: (e as Error).message }));
  }, [liffId, role, next]);

  return (
    <div className="mx-auto max-w-sm px-6 py-16 text-center">
      {state.kind === "loading" && (
        <>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
          <p className="mt-4 text-sm text-slate-500">กำลังเข้าสู่ระบบด้วย LINE…</p>
        </>
      )}
      {state.kind === "pending" && (
        <>
          <div className="text-4xl">⏳</div>
          <h1 className="mt-3 font-semibold">ส่งคำขอเข้าใช้งานแล้ว</h1>
          <p className="mt-2 text-sm text-slate-500">รอแอดมินอนุมัติ เมื่ออนุมัติแล้วจะมีข้อความแจ้งทาง LINE จากนั้นเปิดแอปนี้อีกครั้ง</p>
        </>
      )}
      {state.kind === "not_admin" && (
        <>
          <div className="text-4xl">🔑</div>
          <h1 className="mt-3 font-semibold">ส่งคำขอสิทธิ์แอดมินแล้ว</h1>
          <p className="mt-2 text-sm text-slate-500">รอแอดมินที่มีอยู่อนุมัติที่หน้า ตั้งค่า → ผู้ดูแลระบบ เมื่ออนุมัติแล้วจะมีข้อความแจ้งทาง LINE จากนั้นเปิดหน้านี้อีกครั้ง</p>
          <p className="mt-4 text-xs text-slate-400">รหัส LINE ของคุณ</p>
          <code className="mt-1 block break-all rounded-xl bg-slate-100 p-3 text-xs">{state.lineUserId}</code>
        </>
      )}
      {state.kind === "error" && (
        <>
          <div className="text-4xl">⚠️</div>
          <h1 className="mt-3 font-semibold">เข้าสู่ระบบไม่สำเร็จ</h1>
          <p className="mt-2 break-words text-sm text-slate-500">{state.message}</p>
          <button className="btn-primary mt-4" onClick={() => location.reload()}>ลองอีกครั้ง</button>
        </>
      )}
    </div>
  );
}
