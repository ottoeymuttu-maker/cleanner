// Firebase Admin app (ฝั่ง server เท่านั้น) ใช้ร่วมกันระหว่าง Firestore และ Storage

import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";

export function firebaseApp() {
  const keyFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  return (
    getApps()[0] ??
    initializeApp({
      credential: keyFile
        ? // ตอนพัฒนา: ชี้ไปที่ไฟล์ service account JSON (อยู่ใน .secrets/ ซึ่งไม่ถูก commit)
          cert(path.resolve(process.cwd(), keyFile))
        : // บนโฮสต์: ใส่ค่าทีละตัวเป็น environment variables
          cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // private key ใน .env เก็บ \n เป็นตัวอักษร ต้องแปลงกลับ
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    })
  );
}
