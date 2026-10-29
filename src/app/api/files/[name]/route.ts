import { promises as fs } from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/db";
import { currentUser } from "@/lib/session";

// เสิร์ฟรูปงาน เฉพาะผู้ที่ login แล้ว (เมื่อย้ายไป Firebase Storage ให้ใช้ signed URL แทน)
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[name]">) {
  if (!(await currentUser())) return new Response("Unauthorized", { status: 401 });
  const { name } = await ctx.params;
  const safe = path.basename(name);
  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, safe));
    const ext = path.extname(safe).slice(1);
    return new Response(buf, {
      headers: { "Content-Type": `image/${ext === "jpg" ? "jpeg" : ext}`, "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
