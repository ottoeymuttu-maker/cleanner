// Firebase Admin app (ฝั่ง server เท่านั้น) ใช้ร่วมกันระหว่าง Firestore และ Storage

import path from "path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";

function credential() {
  const keyFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  // ตอนพัฒนา: ชี้ไปที่ไฟล์ service account JSON (อยู่ใน .secrets/ ซึ่งไม่ถูก commit)
  if (keyFile) return cert(path.resolve(process.cwd(), keyFile));
  // โฮสต์อื่น (เช่น Vercel): ใส่ค่าทีละตัวเป็น environment variables
  if (process.env.FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // private key ใน .env เก็บ \n เป็นตัวอักษร ต้องแปลงกลับ
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }
  // Firebase App Hosting: ใช้ service account ของโฮสต์เอง ไม่ต้องมีไฟล์ key
  return applicationDefault();
}

export function firebaseApp() {
  return (
    getApps()[0] ??
    initializeApp({
      credential: credential(),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    })
  );
}
