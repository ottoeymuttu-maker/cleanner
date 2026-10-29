import { notFound } from "next/navigation";
import { adminAssign, adminRecordPayment, adminSetStatus } from "@/app/actions";
import { Photos, Stars, StatusBadge } from "@/components/ui";
import { getJob, listJobs, listServices, listUsers } from "@/lib/db";
import { baht, jobTotals } from "@/lib/pricing";
import { STATUS_LABEL, TZ, fmtDateTime } from "@/lib/status";
import type { ServiceCategory } from "@/lib/types";
import { QuoteEditor } from "./quote-editor";

const toLocalInput = (iso: string) =>
  new Date(iso).toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T");
const bkkDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const mapLink = (lat?: number, lng?: number) =>
  lat ? <a className="text-brand-700 underline" target="_blank" href={`https://maps.google.com/?q=${lat},${lng}`}>แผนที่</a> : <span className="text-slate-400">ไม่มีพิกัด</span>;

export default async function AdminJob(props: PageProps<"/admin/jobs/[id]">) {
  const { id } = await props.params;
  const job = await getJob(id);
  if (!job) notFound();
  const [users, services, jobs] = await Promise.all([listUsers(), listServices(), listJobs()]);
  const name = (uid: string) => users.find((u) => u.id === uid)?.name ?? uid;
  const customer = users.find((u) => u.id === job.customerId);
  const { total } = jobTotals(job);

  const cats = new Set<ServiceCategory>(
    job.items.map((i) => services.find((s) => s.id === i.serviceId)?.category).filter(Boolean) as ServiceCategory[],
  );
  const staff = users.filter((u) => u.role === "staff" && u.staff?.active);
  const sameDayLoad = (sid: string) =>
    jobs.filter((j) => j.id !== job.id && j.staffIds.includes(sid) && j.status !== "cancelled" && bkkDay(j.scheduledAt) === bkkDay(job.scheduledAt)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">{job.code}</h1>
        <StatusBadge status={job.status} />
        <span className="text-sm text-slate-500">สร้างเมื่อ {fmtDateTime(job.createdAt)}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="card grid gap-3 text-sm sm:grid-cols-2">
            <div><div className="label">ลูกค้า</div>{customer?.name} · {customer?.phone}</div>
            <div><div className="label">วันนัด</div>{fmtDateTime(job.scheduledAt)}</div>
            <div className="sm:col-span-2"><div className="label">ที่อยู่</div>{job.address} {job.lat && mapLink(job.lat, job.lng)}</div>
            {job.note && <div className="sm:col-span-2"><div className="label">หมายเหตุลูกค้า</div>{job.note}</div>}
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">ใบเสนอราคา {job.needsSurvey && <span className="text-xs font-normal text-amber-600">(ลูกค้าขอให้ประเมิน)</span>}</h2>
            <QuoteEditor job={job} services={services.filter((s) => s.active)} canResend={["requested", "quoted"].includes(job.status)} />
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">จ่ายงาน</h2>
            <form action={adminAssign.bind(null, job.id)} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {staff.map((s) => {
                  const match = !cats.size || s.staff!.skills.some((k) => cats.has(k));
                  const load = sameDayLoad(s.id);
                  return (
                    <label key={s.id} className={`flex items-start gap-2 rounded-xl p-2 text-sm ring-1 ring-slate-200 ${match ? "" : "opacity-50"}`}>
                      <input type="checkbox" name="staffIds" value={s.id} defaultChecked={job.staffIds.includes(s.id)} className="mt-1" />
                      <span>
                        <b>{s.name}</b> {s.staff!.type === "supplier" && <span className="text-xs text-violet-600">Supplier</span>}
                        <div className="text-xs text-slate-500">
                          {s.staff!.zone} · วันนั้นมี {load} งาน{!match && " · ทักษะไม่ตรง"}
                        </div>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div><label className="label">เวลานัด</label><input type="datetime-local" name="scheduledAt" defaultValue={toLocalInput(job.scheduledAt)} className="input" /></div>
                <button className="btn-dark">บันทึกการจ่ายงาน</button>
              </div>
              {["requested", "quoted"].includes(job.status) && <p className="text-xs text-amber-600">* ลูกค้ายังไม่ยืนยันใบเสนอราคา — จ่ายงานได้ แต่สถานะจะเปลี่ยนเป็น “จัดช่างแล้ว” เมื่อลูกค้ายืนยัน</p>}
            </form>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">หน้างาน</h2>
            <div className="mb-3 space-y-1 text-sm">
              {job.checkIns.length === 0 && <p className="text-slate-400">ยังไม่มีการเช็คอิน</p>}
              {job.checkIns.map((c, i) => (
                <div key={i}>
                  👷 {name(c.staffId)} · เข้า {fmtDateTime(c.inAt)} ({mapLink(c.inLat, c.inLng)}) · ออก{" "}
                  {c.outAt ? <>{fmtDateTime(c.outAt)} ({mapLink(c.outLat, c.outLng)}) · {((new Date(c.outAt).getTime() - new Date(c.inAt).getTime()) / 36e5).toFixed(1)} ชม.</> : "—"}
                </div>
              ))}
            </div>
            <Photos job={job} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="card space-y-3 text-sm">
            <h2 className="font-semibold">การชำระเงิน</h2>
            {job.payment ? (
              <div>
                {baht(job.payment.amount)} · {job.payment.method} · {fmtDateTime(job.payment.paidAt)}
                <div className={job.payment.verified ? "text-emerald-600" : "text-amber-600"}>{job.payment.verified ? "✓ ยืนยันแล้ว" : "รอตรวจสอบสลิป"}</div>
              </div>
            ) : (
              <p className="text-slate-400">ยังไม่ชำระ (ยอด {baht(total)})</p>
            )}
            {!job.payment?.verified && (
              <form action={adminRecordPayment.bind(null, job.id)} className="flex flex-wrap gap-2">
                <select name="method" defaultValue={job.payment?.method ?? "promptpay"} className="input w-auto">
                  <option value="promptpay">PromptPay</option>
                  <option value="cash">เงินสด</option>
                  <option value="card">บัตร</option>
                </select>
                <input name="amount" type="number" defaultValue={job.payment?.amount ?? total} className="input w-28" />
                <button className="btn-primary">ยืนยันรับเงิน</button>
              </form>
            )}
            {job.customerAcceptedAt && <p className="text-emerald-600">✓ ลูกค้าตรวจรับงานแล้ว</p>}
          </section>

          {job.review && (
            <section className="card text-sm">
              <h2 className="mb-1 font-semibold">รีวิว</h2>
              <Stars rating={job.review.rating} />
              <p className="text-slate-600">{job.review.comment}</p>
            </section>
          )}

          <section className="card text-sm">
            <h2 className="mb-2 font-semibold">เปลี่ยนสถานะ (กรณีพิเศษ)</h2>
            <div className="flex flex-wrap gap-2">
              {(["closed", "cancelled"] as const).filter((s) => s !== job.status).map((s) => (
                <form key={s} action={adminSetStatus.bind(null, job.id, s)}>
                  <button className={s === "cancelled" ? "btn-danger py-1.5" : "btn-outline py-1.5"}>{STATUS_LABEL[s]}</button>
                </form>
              ))}
            </div>
          </section>

          <section className="card text-sm">
            <h2 className="mb-2 font-semibold">ประวัติ</h2>
            <ol className="space-y-2 border-l-2 border-slate-200 pl-3">
              {[...job.timeline].reverse().map((t, i) => (
                <li key={i}>
                  <div className="font-medium">{t.status === "note" ? t.note : STATUS_LABEL[t.status]}</div>
                  <div className="text-xs text-slate-500">
                    {fmtDateTime(t.at)} · {t.by === "system" ? "ระบบ" : name(t.by)}
                    {t.status !== "note" && t.note ? ` · ${t.note}` : ""}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
