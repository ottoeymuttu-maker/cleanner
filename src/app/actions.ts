"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createJob, createPayout, deleteUser, findUserByLine, getJob, getPayout, getSettings, getUser, listJobs, listServices, listUsers, newId,
  updateJob, updatePayout, updateSettings, upsertService, upsertUser,
} from "@/lib/db";
import { notify } from "@/lib/line";
import { adminLineIds, verifyIdToken } from "@/lib/line-auth";
import { payoutTotals, unpaidLines } from "@/lib/payroll";
import { savePhoto } from "@/lib/photos";
import { jobTotals } from "@/lib/pricing";
import { SESSION_COOKIE, currentUser, demoLoginEnabled, requireRole, sessionValue } from "@/lib/session";
import { STATUS_LABEL } from "@/lib/status";
import type { Job, JobItem, JobStatus, PayModel, ServiceCategory, User } from "@/lib/types";

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
  if (job.status === "completed" && job.customerAcceptedAt && job.payment?.verified && job.payment.amount >= jobTotals(job).total) {
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
  if (!demoLoginEnabled()) throw new Error("ปิดการ login ทดลองบนเว็บจริง");
  const user = await getUser(str(formData, "userId"));
  if (!user) return;
  await startSession(user.id);
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

  const phone = str(formData, "phone");
  if (!user.address || (phone && phone !== user.phone)) await upsertUser({ ...user, address: user.address || address, phone: phone || user.phone });
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
  const { total } = jobTotals(job);
  if ((job.payment?.amount ?? 0) >= total) return;
  await updateJob(jobId, (j) => {
    // ชำระครั้งแรก หรือชำระส่วนต่างหลังมีงานเพิ่ม
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
  const { user, job } = await assignedJob(jobId);
  const file = formData.get("photo");
  const kind = str(formData, "kind") === "after" ? "after" : "before";
  if (!(file instanceof File) || file.size === 0) return;
  // ลำดับบังคับ: เช็คอิน → รูปก่อนทำ → รูปหลังทำ → ปิดงาน
  if (job.status !== "in_progress") throw new Error("กรุณาเช็คอินหน้างานก่อนถ่ายรูป");
  if (kind === "after" && !job.photos.some((p) => p.kind === "before")) throw new Error("กรุณาถ่ายรูปก่อนทำงานก่อน");
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("รองรับเฉพาะรูปภาพไม่เกิน 10MB");

  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "");
  const name = `${jobId}-${kind}-${Date.now()}.${ext}`;
  await savePhoto(name, Buffer.from(await file.arrayBuffer()), file.type);
  await updateJob(jobId, (j) => {
    j.photos.push({ kind, file: name, at: now(), by: user.id });
  });
  refresh(jobId);
}

export async function staffComplete(jobId: string, lat?: number, lng?: number) {
  const { user, job } = await assignedJob(jobId);
  if (job.status !== "in_progress") return;
  if (job.addOns?.some((a) => ["requested", "quoted"].includes(a.status)))
    throw new Error("มีคำของานเพิ่มที่รอแอดมิน/ลูกค้ายืนยัน ปิดงานไม่ได้");
  if (!job.photos.some((p) => p.kind === "before")) throw new Error("กรุณาถ่ายรูปก่อนทำงาน");
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
    staffPay: num(formData, "staffPay"),
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
      payModel: str(formData, "payModel") as PayModel,
      rate: num(formData, "rate"),
      serviceRates: Object.fromEntries(
        [...formData.entries()]
          .filter(([k, v]) => k.startsWith("rate_") && String(v).trim() !== "")
          .map(([k, v]) => [k.slice(5), Number(v)]),
      ),
      withholdingTax: formData.get("withholdingTax") === "on",
      bankName: str(formData, "bankName"),
      bankAccount: str(formData, "bankAccount"),
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

// ================= จ่ายค่าแรงช่าง / แม่บ้าน / Supplier =================

export async function adminCreatePayout(staffId: string, formData: FormData) {
  const admin = await requireRole("admin");
  const [staff, jobs, services] = await Promise.all([getUser(staffId), listJobs(), listServices()]);
  if (!staff?.staff) throw new Error("ไม่พบพนักงาน");
  const picked = new Set(formData.getAll("jobIds").map(String));
  const lines = unpaidLines(staff, jobs, services).filter((l) => picked.has(l.jobId));
  if (!lines.length) throw new Error("กรุณาเลือกงานอย่างน้อย 1 งาน");

  const labels = formData.getAll("adjLabel").map(String);
  const amounts = formData.getAll("adjAmount").map(Number);
  const adjustments = labels
    .map((label, i) => ({ label: label.trim(), amount: amounts[i] || 0 }))
    .filter((a) => a.label && a.amount);
  const withholding = formData.get("withholdingTax") === "on";
  const { wht, net } = payoutTotals(lines, adjustments, withholding);

  const payout = await createPayout({
    staffId,
    createdAt: now(),
    createdBy: admin.id,
    lines,
    adjustments,
    withholdingTax: wht,
    total: net,
    status: "pending",
    note: str(formData, "note"),
  });
  refresh();
  redirect(`/admin/payouts/${payout.id}`);
}

export async function adminMarkPayoutPaid(payoutId: string, formData: FormData) {
  await requireRole("admin");
  const payout = await updatePayout(payoutId, { status: "paid", paidAt: now(), paidRef: str(formData, "paidRef") });
  await notify(payout.staffId, `โอนค่าแรง ${payout.code} จำนวน ${payout.total.toLocaleString()} บาท เรียบร้อยแล้ว`);
  refresh();
}

export async function adminVoidPayout(payoutId: string) {
  await requireRole("admin");
  const payout = await getPayout(payoutId);
  if (payout?.status === "paid") throw new Error("รายการที่โอนแล้วยกเลิกไม่ได้");
  await updatePayout(payoutId, { status: "void" });
  refresh();
}

// ================= งานเพิ่ม / ขยายเวลาหน้างาน =================

const ADDON_OPEN = ["requested", "quoted"];

/** ทีมหน้างานหรือลูกค้าแจ้งขอเพิ่มงาน/เวลา — ยังไม่คิดเงินจนกว่าแอดมินตีราคาและลูกค้ายืนยัน */
export async function requestAddOn(jobId: string, formData: FormData) {
  const user = await currentUser();
  const job = await getJob(jobId);
  if (!user || !job) throw new Error("ไม่พบงาน");
  const allowed =
    (user.role === "staff" && job.staffIds.includes(user.id)) || (user.role === "customer" && job.customerId === user.id);
  if (!allowed || !["assigned", "on_the_way", "in_progress"].includes(job.status)) throw new Error("ขอเพิ่มงานไม่ได้ในสถานะนี้");

  const services = await listServices();
  const svc = services.find((s) => s.id === str(formData, "serviceId"));
  const qty = num(formData, "qty");
  const items: JobItem[] = svc && qty > 0 ? [{ serviceId: svc.id, name: svc.name, qty, unitPrice: svc.price }] : [];
  const reason = str(formData, "reason");
  if (!items.length && !reason) throw new Error("กรุณาเลือกบริการหรือระบุรายละเอียด");

  await updateJob(jobId, (j) => {
    (j.addOns ??= []).push({ id: newId("ao"), reason, items, status: "requested", requestedBy: user.id, requestedAt: now() });
    j.timeline.push({ status: "note", at: now(), by: user.id, note: `ขอเพิ่มงาน: ${items.map((i) => `${i.name} ×${i.qty}`).join(", ") || reason}` });
  });
  await notifyAdmins(`⏱️ ${job.code} ${user.name} ขอเพิ่มงาน/เวลา กรุณาตีราคาและส่งให้ลูกค้ายืนยัน`);
  refresh(jobId);
}

/** แอดมินตีราคางานเพิ่ม (addOnId = "new" คือแอดมินสร้างเองจากการโทรแจ้ง) แล้วส่งให้ลูกค้ายืนยัน */
export async function adminQuoteAddOn(jobId: string, addOnId: string, formData: FormData) {
  const admin = await requireRole("admin");
  const names = formData.getAll("itemName").map(String);
  const qtys = formData.getAll("itemQty").map(Number);
  const prices = formData.getAll("itemPrice").map(Number);
  const serviceIds = formData.getAll("itemServiceId").map(String);
  const items: JobItem[] = names
    .map((name, i) => ({ serviceId: serviceIds[i] || null, name: name.trim(), qty: qtys[i] || 0, unitPrice: prices[i] || 0 }))
    .filter((i) => i.name && i.qty > 0);
  if (!items.length) throw new Error("กรุณาระบุรายการ");

  const job = await updateJob(jobId, (j) => {
    j.addOns ??= [];
    let ao = j.addOns.find((a) => a.id === addOnId);
    if (!ao) {
      ao = { id: newId("ao"), reason: str(formData, "reason"), items: [], status: "requested", requestedBy: admin.id, requestedAt: now() };
      j.addOns.push(ao);
    }
    if (!ADDON_OPEN.includes(ao.status)) throw new Error("รายการนี้ปิดไปแล้ว");
    Object.assign(ao, { items, status: "quoted", quotedAt: now() });
    j.timeline.push({ status: "note", at: now(), by: admin.id, note: "ส่งใบเสนอราคางานเพิ่มให้ลูกค้า" });
  });
  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  await notify(job.customerId, `${job.code}: ใบเสนอราคางานเพิ่ม ${total.toLocaleString()} บาท กรุณากดยืนยันในเมนูงานของฉัน`);
  refresh(jobId);
}

export async function adminRejectAddOn(jobId: string, addOnId: string) {
  const admin = await requireRole("admin");
  await updateJob(jobId, (j) => {
    const ao = j.addOns?.find((a) => a.id === addOnId);
    if (ao && ADDON_OPEN.includes(ao.status)) Object.assign(ao, { status: "rejected", decidedAt: now() });
    j.timeline.push({ status: "note", at: now(), by: admin.id, note: "แอดมินปฏิเสธคำขอเพิ่มงาน" });
  });
  refresh(jobId);
}

/** ลูกค้ายืนยัน/ปฏิเสธงานเพิ่ม — ยืนยันแล้วรายการจะรวมเข้าใบงาน (คิดเงินลูกค้าและค่าแรงทีม) */
export async function customerDecideAddOn(jobId: string, addOnId: string, accept: boolean) {
  const { user, job } = await ownJob(jobId);
  const updated = await updateJob(jobId, (j) => {
    const ao = j.addOns?.find((a) => a.id === addOnId);
    if (!ao || ao.status !== "quoted") throw new Error("ไม่มีใบเสนอราคาที่รอยืนยัน");
    Object.assign(ao, { status: accept ? "accepted" : "rejected", decidedAt: now() });
    if (accept) j.items.push(...ao.items.map((i) => ({ ...i, name: `${i.name} (เพิ่มหน้างาน)` })));
    j.timeline.push({ status: "note", at: now(), by: user.id, note: accept ? "ลูกค้ายืนยันงานเพิ่ม" : "ลูกค้าไม่รับงานเพิ่ม" });
  });
  const msg = `${job.code}: ลูกค้า${accept ? "ยืนยัน" : "ไม่รับ"}งานเพิ่ม${accept ? " ทำต่อได้เลย" : ""}`;
  for (const s of updated.staffIds) await notify(s, msg);
  await notifyAdmins(msg);
  refresh(jobId);
}

// ================= LINE Login (LIFF) =================

type LoginResult = { ok: true } | { ok: false; reason: "pending" | "not_admin" | "error"; lineUserId?: string; message?: string };

async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, sessionValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** รับ ID token จาก LIFF → ตรวจกับ LINE → หา/สร้างผู้ใช้ตาม role → ออก session */
export async function liffLogin(idToken: string, role: "customer" | "staff" | "admin"): Promise<LoginResult> {
  let profile;
  try {
    profile = await verifyIdToken(idToken);
  } catch (e) {
    return { ok: false, reason: "error", message: (e as Error).message };
  }

  if (role === "admin") {
    // เจ้าของระบบ (ADMIN_LINE_USER_IDS) เข้าได้เสมอ คนอื่นต้องให้แอดมินที่มีอยู่อนุมัติในหน้าตั้งค่า
    const owner = adminLineIds().includes(profile.userId);
    let admin = await findUserByLine(profile.userId, "admin");
    if (!admin) {
      admin = { id: newId("a"), role: "admin", name: profile.name, phone: "", lineUserId: profile.userId, pictureUrl: profile.picture, pendingAdmin: !owner };
      await upsertUser(admin);
      if (!owner) await notifyAdmins(`🔑 ${profile.name} ขอสิทธิ์แอดมิน อนุมัติได้ที่ ตั้งค่า → ผู้ดูแลระบบ`);
    } else if (owner && admin.pendingAdmin) {
      admin = { ...admin, pendingAdmin: false };
      await upsertUser(admin);
    }
    if (admin.pendingAdmin) return { ok: false, reason: "not_admin", lineUserId: profile.userId };
    await startSession(admin.id);
    return { ok: true };
  }

  if (role === "staff") {
    let staff = await findUserByLine(profile.userId, "staff");
    if (!staff) {
      // ครั้งแรก: สร้างคำขอรออนุมัติ แอดมินจะอนุมัติเป็นคนใหม่หรือผูกกับประวัติพนักงานเดิม
      staff = {
        id: newId("s"),
        role: "staff",
        name: profile.name,
        phone: "",
        lineUserId: profile.userId,
        pictureUrl: profile.picture,
        staff: { type: "employee", skills: [], zone: "", payModel: "hourly", rate: 0, joinedAt: now().slice(0, 10), active: false, pendingApproval: true },
      };
      await upsertUser(staff);
      await notifyAdmins(`👷 ${profile.name} ขอเข้าใช้งานแอปทีมงาน กรุณาอนุมัติที่หน้าพนักงาน`);
    }
    await startSession(staff.id);
    return staff.staff?.pendingApproval || !staff.staff?.active ? { ok: false, reason: "pending" } : { ok: true };
  }

  let customer = await findUserByLine(profile.userId, "customer");
  if (!customer) {
    customer = { id: newId("c"), role: "customer", name: profile.name, phone: "", lineUserId: profile.userId, pictureUrl: profile.picture };
    await upsertUser(customer);
  }
  await startSession(customer.id);
  return { ok: true };
}

/** แอดมินอนุมัติช่างที่ขอเข้าใช้งาน: เป็นคนใหม่ หรือผูก LINE เข้ากับประวัติพนักงานเดิม */
export async function adminApproveStaff(pendingId: string, formData: FormData) {
  await requireRole("admin");
  const pending = await getUser(pendingId);
  if (!pending?.staff?.pendingApproval) return;
  const linkTo = str(formData, "linkTo");
  if (linkTo) {
    const existing = await getUser(linkTo);
    if (!existing?.staff) throw new Error("ไม่พบพนักงาน");
    await upsertUser({ ...existing, lineUserId: pending.lineUserId, pictureUrl: pending.pictureUrl });
    await deleteUser(pending.id);
    await notify(existing.id, "แอดมินอนุมัติแล้ว เปิดแอปทีมงานเพื่อดูงานได้เลย");
    refresh();
    redirect(`/admin/staff/${existing.id}`);
  }
  await upsertUser({ ...pending, staff: { ...pending.staff, pendingApproval: false, active: true } });
  await notify(pending.id, "แอดมินอนุมัติแล้ว เปิดแอปทีมงานเพื่อดูงานได้เลย");
  refresh();
  redirect(`/admin/staff/${pending.id}`);
}

export async function adminRejectStaff(pendingId: string) {
  await requireRole("admin");
  const pending = await getUser(pendingId);
  if (pending?.staff?.pendingApproval) await deleteUser(pending.id);
  refresh();
}

export async function adminApproveAdmin(userId: string) {
  await requireRole("admin");
  const u = await getUser(userId);
  if (u?.role !== "admin" || !u.pendingAdmin) return;
  await upsertUser({ ...u, pendingAdmin: false });
  await notify(u.id, "คุณได้รับสิทธิ์แอดมินแล้ว เปิดหน้าหลังบ้านได้เลย");
  refresh();
}

/** ถอนสิทธิ์/ปฏิเสธคำขอแอดมิน — ถอนตัวเอง หรือเจ้าของระบบ (ADMIN_LINE_USER_IDS) ไม่ได้ */
export async function adminRemoveAdmin(userId: string) {
  const me = await requireRole("admin");
  const u = await getUser(userId);
  if (u?.role !== "admin" || u.id === me.id) return;
  if (u.lineUserId && adminLineIds().includes(u.lineUserId)) throw new Error("ถอนสิทธิ์เจ้าของระบบไม่ได้");
  await deleteUser(u.id);
  refresh();
}
