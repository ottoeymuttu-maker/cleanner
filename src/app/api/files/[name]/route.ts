import { readPhoto } from "@/lib/photos";
import { currentUser } from "@/lib/session";

// เสิร์ฟรูปงาน เฉพาะผู้ที่ login แล้ว
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[name]">) {
  if (!(await currentUser())) return new Response("Unauthorized", { status: 401 });
  const photo = await readPhoto((await ctx.params).name);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: { "Content-Type": photo.contentType, "Cache-Control": "private, max-age=86400" },
  });
}
