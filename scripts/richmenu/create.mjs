// สร้าง Rich Menu ของ OA และตั้งเป็นเมนูหลักให้ทุกคน
// ใช้: node scripts/richmenu/create.mjs   (อ่าน LINE_CHANNEL_ACCESS_TOKEN และ LIFF_ID_* จาก .env.local)
// รันซ้ำได้: จะลบเมนูชื่อเดียวกันอันเก่าก่อนสร้างใหม่
// แก้รูป: แก้ menu.html แล้วเรนเดอร์เป็น 2500x1686 (ดู README ในโฟลเดอร์นี้) แล้วบันทึกเป็น menu.jpg

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(path.join(here, "../../.env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const token = env.LINE_CHANNEL_ACCESS_TOKEN;
const customer = `https://liff.line.me/${env.LIFF_ID_CUSTOMER}`;
const staff = `https://liff.line.me/${env.LIFF_ID_STAFF}`;
if (!token || !env.LIFF_ID_CUSTOMER || !env.LIFF_ID_STAFF) throw new Error("ต้องมี LINE_CHANNEL_ACCESS_TOKEN, LIFF_ID_CUSTOMER, LIFF_ID_STAFF ใน .env.local");

const NAME = "cleanner-main";
const auth = { Authorization: `Bearer ${token}` };

async function api(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...auth, ...init.headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${url} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

const area = (x, y, width, height, action) => ({ bounds: { x, y, width, height }, action });

const menu = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: NAME,
  chatBarText: "เมนูจองบริการ", // ไม่เกิน 14 ตัวอักษร
  areas: [
    area(0, 0, 833, 1000, { type: "uri", label: "จองล้างแอร์", uri: `${customer}/book?cat=aircon` }),
    area(833, 0, 834, 1000, { type: "uri", label: "จองแม่บ้าน", uri: `${customer}/book?cat=cleaning` }),
    area(1667, 0, 833, 1000, { type: "uri", label: "งานของฉัน", uri: `${customer}/jobs` }),
    area(0, 1000, 1250, 686, { type: "message", label: "ติดต่อร้าน", text: "ติดต่อร้าน" }),
    area(1250, 1000, 1250, 686, { type: "uri", label: "สำหรับทีมงาน", uri: staff }),
  ],
};

const { richmenus } = await api("https://api.line.me/v2/bot/richmenu/list");
for (const m of richmenus.filter((m) => m.name === NAME)) {
  await api(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, { method: "DELETE" });
  console.log("ลบเมนูเก่า", m.richMenuId);
}

const { richMenuId } = await api("https://api.line.me/v2/bot/richmenu", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(menu),
});
console.log("สร้างเมนู", richMenuId);

await api(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: "POST",
  headers: { "Content-Type": "image/jpeg" },
  body: readFileSync(path.join(here, "menu.jpg")),
});
console.log("อัปโหลดรูปแล้ว");

await api(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: "POST" });
const def = await api("https://api.line.me/v2/bot/user/all/richmenu");
console.log("เมนูหลักตอนนี้:", def.richMenuId, def.richMenuId === richMenuId ? "✅" : "❌");
