import type { DbShape } from "../types";

const day = (offset: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export function seedData(): DbShape {
  const now = new Date().toISOString();
  return {
    seq: 3,
    settings: {
      shopName: "Clean & Cool",
      promptpayId: "0812345678",
      travelFeeBase: 100,
      quoteValidDays: 7,
      vatRegistered: false,
    },
    services: [
      { id: "ac-wall-normal", category: "aircon", name: "ล้างแอร์ติดผนัง 9,000–18,000 BTU (ล้างธรรมดา)", unit: "เครื่อง", price: 600, durationMin: 60, staffPay: 300, active: true },
      { id: "ac-wall-big", category: "aircon", name: "ล้างแอร์ติดผนัง 9,000–18,000 BTU (ล้างใหญ่/ถอดล้าง)", unit: "เครื่อง", price: 1200, durationMin: 120, staffPay: 600, active: true },
      { id: "ac-wall-xl", category: "aircon", name: "ล้างแอร์ติดผนัง 24,000 BTU ขึ้นไป", unit: "เครื่อง", price: 800, durationMin: 75, staffPay: 400, active: true },
      { id: "ac-cassette", category: "aircon", name: "ล้างแอร์สี่ทิศทาง / ฝังฝ้า", unit: "เครื่อง", price: 1500, durationMin: 120, staffPay: 700, active: true },
      { id: "ac-ceiling", category: "aircon", name: "ล้างแอร์แขวนใต้ฝ้า", unit: "เครื่อง", price: 1200, durationMin: 90, staffPay: 550, active: true },
      { id: "ac-refill", category: "aircon", name: "เติมน้ำยาแอร์ R32/R410", unit: "เครื่อง", price: 900, durationMin: 30, staffPay: 400, active: true },
      { id: "cl-hourly", category: "cleaning", name: "แม่บ้านทำความสะอาดรายชั่วโมง", unit: "ชั่วโมง", price: 250, durationMin: 60, staffPay: 120, active: true },
      { id: "cl-condo-big", category: "cleaning", name: "Big Cleaning คอนโด ไม่เกิน 35 ตร.ม.", unit: "ครั้ง", price: 1990, durationMin: 240, staffPay: 900, active: true },
      { id: "cl-house-big", category: "cleaning", name: "Big Cleaning บ้าน ไม่เกิน 150 ตร.ม.", unit: "ครั้ง", price: 4500, durationMin: 480, staffPay: 2000, active: true },
      { id: "cl-sofa", category: "cleaning", name: "ซักโซฟา (ต่อที่นั่ง)", unit: "ครั้ง", price: 350, durationMin: 30, staffPay: 150, active: true },
    ],
    users: [
      { id: "admin1", role: "admin", name: "แอดมิน", phone: "020000000" },
      { id: "c1", role: "customer", name: "คุณสมชาย ใจดี", phone: "0891112222", address: "99/1 คอนโด The Base ห้อง 1203 ถ.สุขุมวิท 77 กรุงเทพฯ" },
      { id: "c2", role: "customer", name: "คุณมาลี รักบ้าน", phone: "0893334444", address: "12 ซ.ลาดพร้าว 101 แขวงคลองจั่น กรุงเทพฯ" },
      {
        id: "s1", role: "staff", name: "ช่างเอก (ทีมแอร์)", phone: "0811110001",
        staff: { type: "employee", skills: ["aircon"], zone: "สุขุมวิท / บางนา", payModel: "hourly", rate: 120, joinedAt: "2025-03-01", active: true },
      },
      {
        id: "s2", role: "staff", name: "ช่างบอย (ทีมแอร์)", phone: "0811110002",
        staff: { type: "supplier", company: "บอยแอร์เซอร์วิส", skills: ["aircon"], zone: "ลาดพร้าว / บางกะปิ", payModel: "per_service", rate: 0, serviceRates: { "ac-wall-normal": 320 }, withholdingTax: true, bankName: "กสิกรไทย", bankAccount: "123-4-56789-0", joinedAt: "2025-06-15", active: true },
      },
      {
        id: "s3", role: "staff", name: "พี่นิด (แม่บ้าน)", phone: "0811110003",
        staff: { type: "employee", skills: ["cleaning"], zone: "กรุงเทพฯ ตะวันออก", payModel: "hourly", rate: 90, joinedAt: "2024-11-01", active: true },
      },
      {
        id: "s4", role: "staff", name: "พี่แดง (แม่บ้าน)", phone: "0811110004",
        staff: { type: "supplier", company: "", skills: ["cleaning"], zone: "กรุงเทพฯ เหนือ", payModel: "per_job", rate: 500, withholdingTax: true, joinedAt: "2025-01-10", active: true },
      },
    ],
    jobs: [
      {
        id: "j1", code: "JOB-0001", customerId: "c1",
        address: "99/1 คอนโด The Base ห้อง 1203 ถ.สุขุมวิท 77 กรุงเทพฯ",
        scheduledAt: day(0, 10),
        items: [{ serviceId: "ac-wall-normal", name: "ล้างแอร์ติดผนัง 9,000–18,000 BTU (ล้างธรรมดา)", qty: 2, unitPrice: 600 }],
        travelFee: 100, discount: 0, needsSurvey: false, note: "จอดรถใต้คอนโดได้",
        status: "assigned", staffIds: ["s1"],
        quotation: { issuedAt: day(-2, 9), validUntil: day(5, 9), acceptedAt: day(-2, 10) },
        timeline: [
          { status: "quoted", at: day(-2, 9), by: "system" },
          { status: "confirmed", at: day(-2, 10), by: "c1" },
          { status: "assigned", at: day(-1, 15), by: "admin1" },
        ],
        photos: [], checkIns: [], createdAt: day(-2, 9),
      },
      {
        id: "j2", code: "JOB-0002", customerId: "c2",
        address: "12 ซ.ลาดพร้าว 101 แขวงคลองจั่น กรุงเทพฯ",
        scheduledAt: day(-3, 9),
        items: [{ serviceId: "cl-house-big", name: "Big Cleaning บ้าน ไม่เกิน 150 ตร.ม.", qty: 1, unitPrice: 4500 }],
        travelFee: 100, discount: 300, needsSurvey: false, note: "",
        status: "closed", staffIds: ["s3"],
        quotation: { issuedAt: day(-6, 9), validUntil: day(1, 9), acceptedAt: day(-6, 11) },
        payment: { method: "promptpay", amount: 4300, paidAt: day(-3, 17), verified: true },
        timeline: [
          { status: "quoted", at: day(-6, 9), by: "system" },
          { status: "confirmed", at: day(-6, 11), by: "c2" },
          { status: "assigned", at: day(-5, 10), by: "admin1" },
          { status: "in_progress", at: day(-3, 9), by: "s3" },
          { status: "completed", at: day(-3, 16), by: "s3" },
          { status: "closed", at: day(-3, 17), by: "c2" },
        ],
        photos: [],
        checkIns: [{ staffId: "s3", inAt: day(-3, 9), outAt: new Date(new Date(day(-3, 16)).getTime() + 30 * 60000).toISOString() }],
        review: { rating: 5, comment: "สะอาดมาก พี่นิดใจดี", at: day(-3, 18) },
        createdAt: day(-6, 9),
      },
      {
        id: "j3", code: "JOB-0003", customerId: "c2",
        address: "12 ซ.ลาดพร้าว 101 แขวงคลองจั่น กรุงเทพฯ",
        scheduledAt: day(2, 13),
        items: [],
        travelFee: 0, discount: 0, needsSurvey: true, note: "แอร์ฝังฝ้า 3 เครื่อง มีน้ำหยด อยากให้ประเมินก่อน",
        status: "requested", staffIds: [],
        timeline: [{ status: "requested", at: now, by: "c2" }],
        photos: [], checkIns: [], createdAt: now,
      },
    ],
  };
}
