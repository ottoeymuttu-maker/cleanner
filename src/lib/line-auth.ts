// LINE Login: ตรวจ ID token ที่ได้จาก LIFF กับเซิร์ฟเวอร์ LINE
// https://developers.line.biz/en/reference/line-login/#verify-id-token

export interface LineProfile {
  userId: string;
  name: string;
  picture?: string;
}

export async function verifyIdToken(idToken: string): Promise<LineProfile> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) throw new Error("ยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID");
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
  });
  const data = await res.json();
  if (!res.ok || !data.sub) throw new Error("ยืนยันตัวตนกับ LINE ไม่สำเร็จ: " + (data.error_description ?? res.status));
  return { userId: data.sub, name: data.name ?? "ผู้ใช้ LINE", picture: data.picture };
}

/** LINE userId ที่เป็นแอดมิน (ตั้งใน apphosting.yaml / .env.local คั่นด้วย ,) */
export const adminLineIds = () =>
  (process.env.ADMIN_LINE_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export const LIFF_IDS = {
  customer: () => process.env.LIFF_ID_CUSTOMER ?? "",
  staff: () => process.env.LIFF_ID_STAFF ?? "",
};
