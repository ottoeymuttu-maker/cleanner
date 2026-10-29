# cleanner — ระบบจองล้างแอร์ & แม่บ้านบน LINE

Next.js 16 (App Router) + Tailwind 4 · ฐานข้อมูล Firestore (หรือไฟล์ JSON ตอนพัฒนา)

| ส่วน | URL | ผู้ใช้ |
|---|---|---|
| ลูกค้า (LIFF) | `/liff` | จองบริการ ใบเสนอราคา PromptPay QR ติดตามงาน ตรวจรับงาน รีวิว |
| ช่าง / แม่บ้าน (LIFF) | `/staff` | คิวงาน นำทาง เช็คอิน/เอาท์ GPS รูปก่อน-หลัง ปิดงาน |
| หลังบ้าน | `/admin` | แดชบอร์ด จ่ายงาน แก้ใบเสนอราคา ยืนยันรับเงิน พนักงาน/Supplier ชั่วโมงทำงาน (Export CSV) ราคา ตั้งค่า |

## เริ่มใช้งาน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 แล้วเลือกผู้ใช้ทดลอง (จำลอง LINE Login)

ถ้าไม่มีไฟล์ `.env.local` ระบบเก็บข้อมูลที่ `data/db.json` (ลบไฟล์นี้เพื่อรีเซ็ตเป็นข้อมูลตัวอย่าง)

## เชื่อม Firebase / Firestore

1. Firebase Console → สร้าง Firestore Database (โหมด production, region `asia-southeast1`)
2. Project settings → Service accounts → **Generate new private key**
3. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
4. `npm run dev` — ครั้งแรกระบบจะใส่ข้อมูลตัวอย่างลง Firestore ให้อัตโนมัติ

Firestore ถูกเข้าถึงจาก server เท่านั้น (Admin SDK) จึงตั้ง Security Rules ให้ปิดการเข้าถึงจาก client ทั้งหมดได้

## โครงสร้าง

```
src/lib/db/        ชั้นข้อมูล: backend.ts (interface), firestore.ts, json.ts, seed.ts
src/app/actions.ts Server Actions ทุก workflow (ตรวจสิทธิ์ตาม role)
src/lib/line.ts    แจ้งเตือน LINE push (mock จนกว่าจะใส่ token)
src/lib/promptpay.ts  สร้าง PromptPay QR payload (EMVCo)
```

## ขั้นถัดไป

- LIFF login จริง + ตรวจ ID token
- ย้ายรูปงานไป Firebase Storage
- Flex Message สำหรับใบเสนอราคา / แจ้งสถานะ
- Payment gateway (บัตร/e-wallet) + ตรวจสลิปอัตโนมัติ
