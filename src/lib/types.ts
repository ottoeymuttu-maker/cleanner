export type Role = "customer" | "staff" | "admin";
export type ServiceCategory = "aircon" | "cleaning";

export interface Service {
  id: string;
  category: ServiceCategory;
  name: string;
  unit: "เครื่อง" | "ชั่วโมง" | "ครั้ง";
  price: number;
  durationMin: number; // ต่อ 1 หน่วย ใช้ประมาณเวลางาน
  active: boolean;
}

export interface StaffProfile {
  type: "employee" | "supplier";
  skills: ServiceCategory[];
  zone: string;
  payModel: "hourly" | "per_job" | "commission";
  rate: number; // บาท/ชม., บาท/งาน หรือ % ตาม payModel
  idCardNo?: string;
  company?: string; // สำหรับ supplier
  joinedAt: string;
  active: boolean;
  notes?: string;
}

export interface User {
  id: string;
  role: Role;
  name: string;
  phone: string;
  lineUserId?: string;
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
  customerAcceptedAt?: string;
  review?: { rating: number; comment: string; at: string };
  createdAt: string;
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
  seq: number;
}
