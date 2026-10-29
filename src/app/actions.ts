"use server";

import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createJob, getJob, getSettings, getUser, listServices, listUsers, newId,
  updateJob, updateSettings, upsertService, upsertUser, UPLOAD_DIR,
} from "@/lib/db";
import { notify } from "@/lib/line";
import { jobTotals } from "@/lib/pricing";
import { SESSION_COOKIE, requireRole } from "@/lib/session";
import { STATUS_LABEL } from "@/lib/status";
import type { Job, JobItem, JobStatus, ServiceCategory, User } from "@/lib/types";

const now = () => new Date().toISOString();
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(f.get(k) ?? 0) || 0;
/** ค่าจาก <input type="datetime-local"> ถือเป็นเวลาไทย */
const bangkokTime = (v: string) => new Date(v + ":00+07:00").toISOString();

function setStatus(job: Job, status: JobStatus, by: string, note?: string) {
  job.status = status;
  job.timeline.push({ status, at: now(), by, note });
}

/** ปิดงานอัตโนมัติเมื่อ ช่างทำเสร็จ + ลูกค้ายืนยัน + ชำระเงินตรวจสอบแล้ว */
function maybeClose(job: Job, by: string) {
  if (job.status === "completed" && job.customerAcceptedAt && job.payment?.verified) {
    setStatus(job, "closed", by);
  }
}

async function notifyAdmins(text: string) {
  for (const a of await listUsers("admin")) await notify(a.id, text);
}

function refresh(jobId?: string) {
  revalidatePath("/", "layout");
  if (jobId) revalidatePath(`/liff/jobs/${jobId}`);
}

// ================= Session (mock LINE Login) =================

export async function loginAs(formData: FormData) {
  const user = await getUser(str(formData, "userId"));
  if (!user) return;
  (await cookies()).set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(user.role === "customer" ? "/liff" : user.role === "staff" ? "/staff" : "/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

// ================= ลูกค้า =================

export async function createBooking(formData: FormData) {
  const user = await requireRole("customer");
  const services = await listServices();
  const settings = await getSettings();

  const items: JobItem[] = services
    .filter((s) => s.active && num(formData, "qty_" + s.id) > 0)
    .map((s) => ({ serviceId: s.id, name: s.name, qty: num(formData, "qty_" + s.id), unitPrice: s.price }));
  const needsSurvey = formData.get("needsSurvey") === "on" || items.length === 0;
  const scheduled = str(formData, "scheduledAt");
  const address = str(formData, "address");
  if (!scheduled || !address) throw new Error("กรุณาระบุวันเวลาและที่อยู่");

  const ts = now();
  const validUntil = new Date(Date.now() + settings.quoteValidDays * 864e5).toISOString();
  const job = await createJob({
    customerId: user.id,
    address,
    lat: num(formData, "lat") || undefined,
    lng: num(formData, "lng") || undefined,
    scheduledAt: bangkokTime(scheduled),
    items,
    travelFee: items.length ? settings.travelFeeBase : 0,
    discount: 0,
    needsSurvey,
    note: str(formData, "note"),
    // งานมาตรฐานออกใบเสนอราคาทันที งานที่ต้องประเมินรอแอดมิน
    status: needsSurvey ? "requested" : "quoted",
    quotation: needsSurvey ? undefined : { issuedAt: ts, validUntil },
    staffIds: [],
    timeline: [{ status: needsSurvey ? "requested" : "quoted", at: ts, by: user.id }],
    photos: [],
    checkIns: [],
  });

  if (!user.address) await upsertUser({ ...user, address });
  await notifyAdmins(`งานใหม่ ${job.code} จาก ${user.name}${needsSurvey ? " (รอประเมินราคา)" : ""}`);
  refresh();
  redirect(`/liff/jobs/${job.id}`);
}

async function ownJob(jobId: string) {
  const user = await requireRole("customer");
  const job = await getJob(jobId);
  if (!job || job.customerId !== user.id) throw new Error("ไม่พบงาน");
  return { user, job };
}

export async function acceptQuote(jobId: string) {
  const { user, job } = await ownJob(jobId);
  if (job.status !== "quoted") return;
  if (job.quotation && job.quotation.validUntil < now()) throw new Error("ใบเสนอราคาหมดอายุ กรุณาติดต่อร้าน");
  await updateJob(jobId, (j) => {
    j.quotation!.acceptedAt = now();
    setStatus(j, "confirmed", user.id);
    // แอดมินจัดช่างไว้ล่วงหน้าแล้ว
    if (j.staffIds.length) setStatus(j, "assigned", "system");
  });
  await notifyAdmins(`${job.code} ลูกค้ายืนยันใบเสนอราคาแล้ว รอจัดช่าง`);
  refresh(jobId);
}

export async function cancelByCustomer(jobId: string) {
  const { user, job } = await ownJob(jobId);
  if (!["requested", "quoted", "confirmed", "assigned"].includes(job.status)) return;
  await updateJob(jobId, (j) => setStatus(j, "cancelled", user.id, "ลูกค้ายกเลิก"));
  await notifyAdmins(`${job.code} ลูกค้ายกเลิกงาน`);
  refresh(jobId);
}

export async function reportPayment(jobId: string, formData: FormData) {
  const { user, job } = await ownJob(jobId);
  if (job.payment) return;
  const { total } = jobTotals(job);
  await updateJob(jobId, (j) => {
    j.payment = { method: "promptpay", amount: total, paidAt: now(), verified: false };
    j.timeline.push({ status: "note", at: now(), by: user.id, note: "ลูกค้าแจ้งชำระเงินผ่าน PromptPay" + (str(formData, "ref") ? ` (อ้างอิง ${str(formData, "ref")})` : "") });
  });
  await notifyAdmins(`${job.code} ลูกค้าแจ้งโอนเงินแล้ว กรุณาตรวจสอบ`);
  refresh(jobId);
}

export async function customerAcceptWork(jobId: string) {
  const { user, job } = await ownJob(jobId);
  if (job.status !== "completed") return;
  await updateJob(jobId, (j) => {
    j.customerAcceptedAt = now();
    j.timeline.push({ status: "note", at: now(), by: user.id, note: "ลูกค้าตรวจรับงานแล้ว" });
    maybeClose(j, user.id);
  });
  refresh(jobId);
}

export async function submitReview(jobId: string, formData: FormData) {
  const { job } = await ownJob(jobId);
  if (!["completed", "closed"].includes(job.status) || job.review) return;
  const rating = Math.min(5, Math.max(1, num(formData, "rating")));
  await updateJob(jobId, (j) => {
    j.review = { rating, comment: str(formData, "comment"), at: now() };
  });
  if (rating <= 3) await notifyAdmins(`⚠️ ${job.code} ได้รีวิว ${rating} ดาว กรุณาติดตาม`);
  refresh(jobId);
}

// ================= ช่าง / แม่บ้าน =================

async function assignedJob(jobId: string) {
  const user = await requireRole("staff");
  const job = await getJob(jobId);
  if (!job || !job.staffIds.includes(user.id)) throw new Error("ไม่ใช่งานของคุณ");
  return { user, job };
}

export async function staffOnTheWay(jobId: string) {
  const { user, job } = await assignedJob(jobId);
  if (job.status !== "assigned") return;
  await updateJob(jobId, (j) => setStatus(j, "on_the_way", user.id));
  await notify(job.customerId, `${job.code}: ${user.name} กำลังเดินทางไปหาคุณ`);
  refresh(jobId);
}

export async function staffCheckIn(jobId: string, lat?: number, lng?: number) {
  const { user, job } = await assignedJob(jobId);
  if (job.checkIns.some((c) => c.staffId === user.id && !c.outAt)) return;
  await updateJob(jobId, (j) => {
    j.checkIns.push({ staffId: user.id, inAt: now(), inLat: lat, inLng: lng });
    if (["assigned", "on_the_way"].includes(j.status)) setStatus(j, "in_progress", user.id, "เช็คอินหน้างาน");
  });
  await notify(job.customerId, `${job.code}: ช่างถึงหน้างานและเริ่มทำงานแล้ว`);
  refresh(jobId);
}

export async function staffUploadPhoto(jobId: string, formData: FormData) {
  const { user } = await assignedJob(jobId);
  const file = formData.get("photo");
  const kind = str(formData, "kind") === "after" ? "after" : "before";
  if (!(file instanceof File) || file.size === 0) return;
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("รองรับเฉพาะรูปภาพไม่เกิน 10MB");

  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "");
  const name = `${jobId}-${kind}-${Date.now()}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  await updateJob(jobId, (j) => {
    j.photos.push({ kind, file: name, at: now(), by: user.id });
  });
  refresh(jobId);
}

export async function staffComplete(jobId: string, lat?: number, lng?: number) {
  const { user, job } = await assignedJob(jobId);
  if (job.status !== "in_progress") return;
  if (!job.photos.some((p) => p.kind === "after")) throw new Error("กรุณาถ่ายรูปหลังทำงานก่อนปิดงาน");
  await updateJob(jobId, (j) => {
    for (const c of j.checkIns) {
      if (!c.outAt) Object.assign(c, { outAt: now(), outLat: lat, outLng: lng });
    }
    setStatus(j, "completed", user.id);
  });
  await notify(job.customerId, `${job.code}: งานเสร็จแล้ว กรุณาตรวจรับงาน ชำระเงิน และให้คะแนน`);
  refresh(jobId);
}

// ================= แอดมิน =================

export async function adminSaveQuote(jobId: string, formData: FormData) {
  const admin = await requireRole("admin");
  const names = formData.getAll("itemName").map(String);
  const qtys = formData.getAll("itemQty").map(Number);
  const prices = formData.getAll("itemPrice").map(Number);
  const serviceIds = formData.getAll("itemServiceId").map(String);
  const items: JobItem[] = names
    .map((name, i) => ({ serviceId: serviceIds[i] || null, name: name.trim(), qty: qtys[i] || 0, unitPrice: prices[i] || 0 }))
    .filter((i) => i.name && i.qty > 0);
  const settings = await getSettings();

  const job = await updateJob(jobId, (j) => {
    j.items = items;
    j.travelFee = num(formData, "travelFee");
    j.discount = num(formData, "discount");
    const resend = ["requested", "quoted"].includes(j.status);
    if (resend) {
      j.quotation = { issuedAt: now(), validUntil: new Date(Date.now() + settings.quoteValidDays * 864e5).toISOString() };
      setStatus(j, "quoted", admin.id, "ออกใบเสนอราคา");
    } else {
      j.timeline.push({ status: "note", at: now(), by: admin.id, note: "แก้ไขรายการ/ราคา" });
    }
  });
  if (job.status === "quoted") await notify(job.customerId, `${job.code}: ใบเสนอราคาพร้อมแล้ว ยอด ${jobTotals(job).total} บาท กดยืนยันได้ในเมนูงานของฉัน`);
  refresh(jobId);
}

export async function adminAssign(jobId: string, formData: FormData) {
  const admin = await requireRole("admin");
  const staffIds = formData.getAll("staffIds").map(String);
  const scheduled = str(formData, "scheduledAt");
  const job = await updateJob(jobId, (j) => {
    j.staffIds = staffIds;
    if (scheduled) j.scheduledAt = bangkokTime(scheduled);
    if (staffIds.length && j.status === "confirmed") setStatus(j, "assigned", admin.id);
    else j.timeline.push({ status: "note", at: now(), by: admin.id, note: "ปรับช่าง/เวลานัด" });
  });
  for (const s of staffIds) await notify(s, `งานใหม่ ${job.code} วันที่ ${job.scheduledAt.slice(0, 10)} ที่ ${job.address}`);
  refresh(jobId);
}

export async function adminSetStatus(jobId: string, status: JobStatus) {
  const admin = await requireRole("admin");
  await updateJob(jobId, (j) => setStatus(j, status, admin.id, "แอดมินเปลี่ยนสถานะ"));
  const job = await getJob(jobId);
  if (job) await notify(job.customerId, `${job.code}: สถานะเปลี่ยนเป็น "${STATUS_LABEL[status]}"`);
  refresh(jobId);
}

export async function adminRecordPayment(jobId: string, formData: FormData) {
  const admin = await requireRole("admin");
  const method = (str(formData, "method") || "promptpay") as "promptpay" | "cash" | "card";
  await updateJob(jobId, (j) => {
    const amount = num(formData, "amount") || jobTotals(j).total;
    j.payment = { method, amount, paidAt: j.payment?.paidAt ?? now(), verified: true };
    j.timeline.push({ status: "note", at: now(), by: admin.id, note: `ยืนยันรับชำระ ${amount} บาท (${method})` });
    maybeClose(j, admin.id);
  });
  refresh(jobId);
}

export async function adminSaveService(formData: FormData) {
  await requireRole("admin");
  await upsertService({
    id: str(formData, "id") || newId("svc-"),
    category: str(formData, "category") as ServiceCategory,
    name: str(formData, "name"),
    unit: str(formData, "unit") as "เครื่อง" | "ชั่วโมง" | "ครั้ง",
    price: num(formData, "price"),
    durationMin: num(formData, "durationMin"),
    active: formData.get("active") === "on",
  });
  refresh();
}

export async function adminSaveStaff(formData: FormData) {
  await requireRole("admin");
  const id = str(formData, "id") || newId("s");
  const existing = await getUser(id);
  const user: User = {
    ...existing,
    id,
    role: "staff",
    name: str(formData, "name"),
    phone: str(formData, "phone"),
    staff: {
      type: str(formData, "type") as "employee" | "supplier",
      company: str(formData, "company"),
      skills: formData.getAll("skills").map(String) as ServiceCategory[],
      zone: str(formData, "zone"),
      payModel: str(formData, "payModel") as "hourly" | "per_job" | "commission",
      rate: num(formData, "rate"),
      idCardNo: str(formData, "idCardNo"),
      joinedAt: str(formData, "joinedAt") || now().slice(0, 10),
      active: formData.get("active") === "on",
      notes: str(formData, "notes"),
    },
  };
  await upsertUser(user);
  refresh();
  redirect(`/admin/staff/${id}`);
}

export async function adminSaveSettings(formData: FormData) {
  await requireRole("admin");
  await updateSettings({
    shopName: str(formData, "shopName"),
    promptpayId: str(formData, "promptpayId"),
    travelFeeBase: num(formData, "travelFeeBase"),
    quoteValidDays: num(formData, "quoteValidDays") || 7,
    vatRegistered: formData.get("vatRegistered") === "on",
  });
  refresh();
}
