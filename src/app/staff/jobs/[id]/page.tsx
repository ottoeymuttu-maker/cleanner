import { notFound } from "next/navigation";
import { staffOnTheWay, staffUploadPhoto } from "@/app/actions";
import { PageHeader, Photos, StatusBadge } from "@/components/ui";
import { getJob, getUser } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDateTime } from "@/lib/status";
import { GeoButton } from "./geo-button";

export default async function StaffJob(props: PageProps<"/staff/jobs/[id]">) {
  const user = await requireRole("staff");
  const { id } = await props.params;
  const job = await getJob(id);
  if (!job || !job.staffIds.includes(user.id)) notFound();
  const customer = await getUser(job.customerId);
  const checkedIn = job.checkIns.some((c) => c.staffId === user.id && !c.outAt);
  const hasBefore = job.photos.some((p) => p.kind === "before");
  const hasAfter = job.photos.some((p) => p.kind === "after");
  const mapUrl = job.lat
    ? `https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`;

  return (
    <>
      <PageHeader title={job.code} back="/staff" right={<StatusBadge status={job.status} />} />
      <div className="space-y-4 p-4">
        <section className="card space-y-1 text-sm">
          <div className="font-semibold">{fmtDateTime(job.scheduledAt)}</div>
          <div>👤 {customer?.name} · <a className="text-brand-600" href={`tel:${customer?.phone}`}>{customer?.phone}</a></div>
          <div>📍 {job.address}</div>
          <a href={mapUrl} target="_blank" className="inline-block text-brand-600">🧭 นำทางด้วย Google Maps</a>
          {job.note && <div className="rounded-lg bg-amber-50 p-2 text-amber-900">📝 {job.note}</div>}
        </section>

        <section className="card text-sm">
          <h2 className="mb-2 font-semibold">รายการงาน</h2>
          <ul className="list-inside list-disc space-y-1">
            {job.items.map((i, idx) => (
              <li key={idx}>{i.name} × {i.qty}</li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3">
          <h2 className="text-sm font-semibold">ขั้นตอน</h2>
          {job.status === "assigned" && (
            <form action={staffOnTheWay.bind(null, job.id)}>
              <button className="btn-dark w-full">🚗 เริ่มเดินทาง</button>
            </form>
          )}
          {["assigned", "on_the_way"].includes(job.status) && !checkedIn && (
            <GeoButton jobId={job.id} mode="checkin" label="📍 เช็คอินถึงหน้างาน" />
          )}
          {job.status === "in_progress" && (
            <>
              <PhotoForm jobId={job.id} kind="before" done={hasBefore} />
              <PhotoForm jobId={job.id} kind="after" done={hasAfter} />
              <GeoButton jobId={job.id} mode="complete" label="✅ ปิดงาน + เช็คเอาท์" disabled={!hasAfter} />
              {!hasAfter && <p className="text-xs text-slate-500">* ต้องมีรูปหลังทำงานก่อนปิดงาน</p>}
            </>
          )}
          {["completed", "closed"].includes(job.status) && <p className="text-sm text-emerald-700">งานนี้ปิดแล้ว ขอบคุณครับ 🙏</p>}
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold">รูปงาน</h2>
          <Photos job={job} />
        </section>
      </div>
    </>
  );
}

function PhotoForm({ jobId, kind, done }: { jobId: string; kind: "before" | "after"; done: boolean }) {
  return (
    <form action={staffUploadPhoto.bind(null, jobId)} className="flex items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="file" name="photo" accept="image/*" capture="environment" required className="input flex-1 py-1.5 text-xs" />
      <button className={done ? "btn-outline" : "btn-primary"}>
        📷 {kind === "before" ? "ก่อนทำ" : "หลังทำ"} {done && "✓"}
      </button>
    </form>
  );
}
