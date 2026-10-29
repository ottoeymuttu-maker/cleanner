// แจ้งเตือนผ่าน LINE
// ตอนนี้แค่ log ไว้ เมื่อได้ Channel Access Token แล้วให้เปิดใช้ push message:
// POST https://api.line.me/v2/bot/message/push
//   Authorization: Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}
//   { to: user.lineUserId, messages: [{ type: "text", text }] }

import { getUser } from "./db";

export async function notify(userId: string, text: string) {
  const user = await getUser(userId);
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !user?.lineUserId) {
    console.log(`[LINE mock] → ${user?.name ?? userId}: ${text}`);
    return;
  }
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: user.lineUserId, messages: [{ type: "text", text }] }),
  });
}
