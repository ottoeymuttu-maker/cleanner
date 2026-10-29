// เก็บรูปงาน
// มี FIREBASE_STORAGE_BUCKET → Firebase Storage (โฟลเดอร์ jobs/), ไม่มี → data/uploads บนเครื่อง
// รูปเป็นแบบ private ทั้งหมด เสิร์ฟผ่าน /api/files/[name] ที่ตรวจ login ก่อนเสมอ

import { promises as fs } from "fs";
import path from "path";
import { getStorage } from "firebase-admin/storage";
import { firebaseApp } from "./firebase";

const LOCAL_DIR = path.join(process.cwd(), "data", "uploads");
const bucket = () => getStorage(firebaseApp()).bucket();
const storageEnabled = () => !!process.env.FIREBASE_STORAGE_BUCKET;

export async function savePhoto(name: string, data: Buffer, contentType: string) {
  if (storageEnabled()) {
    await bucket().file(`jobs/${name}`).save(data, { contentType, resumable: false });
    return;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, name), data);
}

export async function readPhoto(name: string): Promise<{ data: Buffer; contentType: string } | null> {
  const safe = path.basename(name);
  try {
    if (storageEnabled()) {
      const file = bucket().file(`jobs/${safe}`);
      const [[data], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
      return { data, contentType: meta.contentType ?? "image/jpeg" };
    }
    const ext = path.extname(safe).slice(1);
    return { data: await fs.readFile(path.join(LOCAL_DIR, safe)), contentType: `image/${ext === "jpg" ? "jpeg" : ext}` };
  } catch {
    return null;
  }
}
