export type Role = "customer" | "staff" | "admin";
export type ServiceCategory = "aircon" | "cleaning";

export interface Service {
  id: string;
  category: ServiceCategory;
  name: string;
  unit: "เครื่อง" | "ชั่วโมง" | "ครั้ง";
  price: number;
  durationMin: number; // ต่อ 1 หน่วย ใช้ประมาณเวลางาน
  staffPay?: number; // ค่าจ้างมาตรฐานที่จ่ายช่าง/แม่บ้าน ต่อ 1 หน่วย (ใช้กับ payModel "per_service")
  active: boolean;
}

export type PayModel = "hourly" | "per_job" | "commission" | "per_service";

export interface StaffProfile {
  type: "employee" | "supplier";
  skills: ServiceCategory[];
  zone: string;
  payModel: PayModel;
  rate: number; // บาท/ชม., บาท/งาน หรือ % ตาม payModel (per_service ไม่ใช้)
  serviceRates?: Record<string, number>; // ราคาเฉพาะคนนี้ ต่อหน่วยบริการ (ทับ Service.staffPay)
  withholdingTax?: boolean; // หัก ณ ที่จ่าย 3% (บุคคลภายนอก)
  bankName?: string;
  bankAccount?: string;
  idCardNo?: string;
  company?: string; // สำหรับ supplier
  joinedAt: string;
  active: boolean;
  pendingApproval?: boolean; // ช่างที่เพิ่ง login ผ่าน LINE ครั้งแรก รอแอดมินอนุมัติ/ผูกกับประวัติเดิม
  notes?: string;
}

export interface User {
  id: string;
  role: Role;
  name: string;
  phone: string;
  lineUserId?: string;
  pictureUrl?: string;
  address?: string;
  staff?: StaffProfile;
}

export type JobStatus =
  | "requested" // รอแอดมินตีราคา
  | "quoted" // ส่งใบเสนอราคาแล้ว
  | "confirmed" // ลูกค้ายืนยันใบเสนอราคา
  | "assigned" // จ่ายงานให้ช่างแล้ว
  | "on_the_way"
  | "in_progress"
  | "completed" // ช่างปิดงาน รอลูกค้ายืนยัน
  | "closed" // ลูกค้ายืนยัน + ชำระเงินครบ
  | "cancelled";

export interface JobItem {
  serviceId: string | null; // null = รายการพิเศษที่แอดมินเพิ่ม
  name: string;
  qty: number;
  unitPrice: number;
}

/** งานเพิ่ม/ขยายเวลาหน้างาน: ทีมหรือลูกค้าขอ → แอดมินตีราคา → ลูกค้ายืนยัน → ทีมทำต่อ */
export interface AddOn {
  id: string;
  reason: string;
  items: JobItem[];
  status: "requested" | "quoted" | "accepted" | "rejected";
  requestedBy: string;
  requestedAt: string;
  quotedAt?: string;
  decidedAt?: string;
}

export interface TimelineEntry {
  status: JobStatus | "note";
  at: string;
  by: string;
  note?: string;
}

export interface CheckIn {
  staffId: string;
  inAt: string;
  inLat?: number;
  inLng?: number;
  outAt?: string;
  outLat?: number;
  outLng?: number;
}

export interface Photo {
  kind: "before" | "after";
  file: string;
  at: string;
  by: string;
}

export interface Job {
  id: string;
  code: string;
  customerId: string;
  address: string;
  lat?: number;
  lng?: number;
  scheduledAt: string;
  items: JobItem[];
  travelFee: number;
  discount: number;
  needsSurvey: boolean;
  note: string;
  status: JobStatus;
  staffIds: string[];
  quotation?: { issuedAt: string; validUntil: string; acceptedAt?: string };
  payment?: { method: "promptpay" | "cash" | "card"; amount: number; paidAt: string; verified: boolean };
  timeline: TimelineEntry[];
  photos: Photo[];
  checkIns: CheckIn[];
  addOns?: AddOn[];
  customerAcceptedAt?: string;
  payouts?: Record<string, string>; // staffId → payoutId ที่จ่ายค่าแรงงานนี้แล้ว
  review?: { rating: number; comment: string; at: string };
  createdAt: string;
}

export interface PayoutLine {
  jobId: string;
  code: string;
  date: string;
  detail: string;
  amount: number;
}

export interface Payout {
  id: string;
  code: string; // PAY-xxxx
  staffId: string;
  createdAt: string;
  createdBy: string;
  lines: PayoutLine[];
  adjustments: { label: string; amount: number }[]; // บวก = เพิ่ม, ลบ = หัก
  withholdingTax: number;
  total: number; // ยอดโอนสุทธิ
  status: "pending" | "paid" | "void";
  paidAt?: string;
  paidRef?: string;
  note?: string;
}

export interface Settings {
  shopName: string;
  promptpayId: string;
  travelFeeBase: number;
  quoteValidDays: number;
  vatRegistered: boolean;
}

export interface DbShape {
  settings: Settings;
  services: Service[];
  users: User[];
  jobs: Job[];
  payouts?: Payout[];
  seq: number;
  payoutSeq?: number;
}
