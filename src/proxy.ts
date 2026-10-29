import { NextResponse, type NextRequest } from "next/server";

// 1) หลัง login LINE จะพากลับมาที่ Endpoint ของ LIFF (/liff หรือ /staff) พร้อม ?liff.state / ?code
//    ต้องเปิดหน้า login (ที่มี LIFF SDK) ให้ SDK จัดการต่อ ไม่ใช่หน้าที่ตรวจสิทธิ์แล้ว redirect ทิ้ง code
// 2) ส่ง path ปัจจุบันให้ server components ใช้พากลับหน้าเดิมหลัง login (เช่น ลิงก์งานจากแจ้งเตือน LINE)
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname + search);

  const isEndpoint = pathname === "/liff" || pathname === "/staff";
  if (isEndpoint && (searchParams.has("liff.state") || searchParams.has("code"))) {
    return NextResponse.rewrite(new URL(`${pathname}/login${search}`, request.url), { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/liff/:path*", "/staff/:path*", "/admin/:path*"],
};
