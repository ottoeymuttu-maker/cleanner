import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { acceptQuote, cancelByCustomer, customerAcceptWork, reportPayment, submitReview } from "@/app/actions";
import { PageHeader, Photos, QuoteTable, Stars, StatusBadge, Tracker } from "@/components/ui";
import { AddOnList, AddOnRequestForm } from "@/components/addons";
import { getJob, getSettings, listServices, listUsers } from "@/lib/db";
import { baht, jobTotals } from "@/lib/pricing";
import { promptPayPayload } from "@/lib/promptpay";
import { requireRole } from "@/lib/session";
import { fmtDate, fmtDateTime } from "@/lib/status";

export default async function JobDetail(props: PageProps<"/liff/jobs/[id]">) {
  const user = await requireRole("customer");
  const { id } = await props.params;
  const job = await getJob(id);
  if (!job || job.customerId !== user.id) notFound();

  const [settings, staff, services] = await Promise.all([getSettings(), listUsers("staff"), listServices()]);
  const { total } = jobTotals(job);
  const assigned = staff.filter((s) => job.staffIds.includes(s.id));
  const paid = job.payment?.amount ?? 0;
  const due = Math.max(0, total - paid);
  const payable = ["confirmed", "assigned", "on_the_way", "in_progress", "completed"].includes(job.status) && due > 0;
  const qr = payable ? await QRCode.toDataURL(promptPayPayload(settings.promptpayId, due), { width: 240, margin: 1 }) : null;
  const canAddOn = ["assigned", "on_the_way", "in_progress"].includes(job.status);
  const cancellable = ["requested", "quoted", "confirmed", "assigned"].includes(job.status);

  return (
    <>
      <PageHeader title={job.code} back="/liff/jobs" right={<StatusBadge status={job.status} />} />
      <div className="space-y-4 p-4">
        <section className="card text-sm">
          <div className="text-xs text-slate-500">นัดหมาย</div>
          <div className="font-semibold">{fmtDateTime(job.scheduledAt)}</div>
          <div className="mt-2 text-xs text-slate-500">สถานที่</div>
          <div>{job.address}</div>
          {job.note && <div className="mt-2 text-xs text-slate-500">หมายเหตุ: {job.note}</div>}
        </section>

        {job.status === "requested" && (
          <section className="card text-sm text-amber-800">⏳ ร้านกำลังประเมินราคา จะแจ้งใบเสนอราคาทาง LINE เร็ว ๆ นี้</section>
        )}

        {job.items.length > 0 && (
          <section className="card">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">ใบเสนอราคา</h2>
              {job.quotation && (
                <span className="text-xs text-slate-500">ใช้ได้ถึง {fmtDate(job.quotation.validUntil)}</span>
              )}
            </div>
            <QuoteTable job={job} />
            {job.status === "quoted" && (
              <form action={acceptQuote.bind(null, job.id)} className="mt-3">
                <button className="btn-primary w-full">✅ ยืนยันใบเสนอราคาและนัดหมาย</button>
              </form>
            )}
          </section>
        )}

        {((job.addOns ?? []).length > 0 || canAddOn) && (
          <section className="card space-y-3">
            <h2 className="text-sm font-semibold">งานเพิ่ม / ขยายเวลา</h2>
            <AddOnList job={job} customerView />
            {canAddOn && <AddOnRequestForm job={job} services={services.filter((s) => s.active)} />}
          </section>
        )}

        {assigned.length > 0 && (
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold">ผู้ให้บริการ</h2>
            {assigned.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span>👷 {s.name}</span>
                <a href={`tel:${s.phone}`} className="text-brand-600">📞 โทร</a>
              </div>
            ))}
          </section>
        )}

        {job.status !== "cancelled" && job.status !== "requested" && (
          <section className="card">
            <h2 className="mb-3 text-sm font-semibold">ติดตามงาน</h2>
            <Tracker job={job} />
          </section>
        )}

        {job.photos.length > 0 && (
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold">รูปก่อน / หลังทำงาน</h2>
            <Photos job={job} />
          </section>
        )}

        {qr && (
          <section className="card text-center">
            <h2 className="text-sm font-semibold">ชำระเงินผ่าน PromptPay</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="PromptPay QR" className="mx-auto my-2 h-56 w-56" />
            <div className="text-lg font-bold">{baht(due)}</div>
            {paid > 0 && <div className="text-xs text-slate-500">ส่วนต่างจากงานเพิ่ม (ชำระแล้ว {baht(paid)})</div>}
            <p className="text-xs text-slate-500">สแกนด้วยแอปธนาคารใดก็ได้ แล้วกดแจ้งชำระเงิน</p>
            <form action={reportPayment.bind(null, job.id)} className="mt-3 space-y-2">
              <input name="ref" placeholder="เลขอ้างอิงในสลิป (ถ้ามี)" className="input" />
              <button className="btn-primary w-full">แจ้งชำระเงินแล้ว</button>
            </form>
          </section>
        )}
        {job.payment && (
          <section className="card text-sm">
            💳 ชำระแล้ว {baht(job.payment.amount)} เมื่อ {fmtDateTime(job.payment.paidAt)}{" "}
            {job.payment.verified ? (
              <span className="text-emerald-600">(ร้านยืนยันแล้ว)</span>
            ) : (
              <span className="text-amber-600">(รอร้านตรวจสอบ)</span>
            )}
          </section>
        )}

        {job.status === "completed" && !job.customerAcceptedAt && (
          <form action={customerAcceptWork.bind(null, job.id)} className="card">
            <p className="mb-2 text-sm">ตรวจสอบงานเรียบร้อยแล้วใช่ไหม?</p>
            <button className="btn-primary w-full">✍️ ตรวจรับงาน</button>
          </form>
        )}

        {["completed", "closed"].includes(job.status) &&
          (job.review ? (
            <section className="card text-sm">
              <h2 className="mb-1 font-semibold">รีวิวของคุณ</h2>
              <Stars rating={job.review.rating} />
              {job.review.comment && <p className="mt-1 text-slate-600">“{job.review.comment}”</p>}
            </section>
          ) : (
            <form action={submitReview.bind(null, job.id)} className="card space-y-2">
              <h2 className="text-sm font-semibold">ให้คะแนนบริการ</h2>
              <div className="flex flex-row-reverse justify-end gap-1 text-3xl [&>label:has(:checked)~label]:text-amber-400">
                {[5, 4, 3, 2, 1].map((n) => (
                  <label key={n} className="cursor-pointer text-slate-300 has-[:checked]:text-amber-400">
                    <input type="radio" name="rating" value={n} required defaultChecked={n === 5} className="sr-only" />★
                  </label>
                ))}
              </div>
              <textarea name="comment" rows={2} placeholder="ความประทับใจ หรือสิ่งที่ควรปรับปรุง" className="input" />
              <button className="btn-primary w-full">ส่งรีวิว</button>
            </form>
          ))}

        {cancellable && (
          <form action={cancelByCustomer.bind(null, job.id)}>
            <button className="btn-danger w-full">ยกเลิกงาน</button>
          </form>
        )}
      </div>
    </>
  );
}
