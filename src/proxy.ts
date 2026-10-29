import { NextResponse, type NextRequest } from "next/server";

// ส่ง path ปัจจุบันให้ server components ใช้พากลับหน้าเดิมหลัง login (เช่น ลิงก์งานจากแจ้งเตือน LINE)
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/liff/:path*", "/staff/:path*", "/admin/:path*"],
};
