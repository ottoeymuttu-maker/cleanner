import Link from "next/link";
import { STATUS_COLOR, STATUS_LABEL, TRACK_STEPS, fmtDateTime } from "@/lib/status";
import { baht, jobTotals } from "@/lib/pricing";
import type { Job, JobStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400" aria-label={`${rating} ดาว`}>
      {"★".repeat(rating)}
      <span className="text-slate-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function PageHeader({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-brand-500 px-4 py-3 text-white shadow">
      {back && (
        <Link href={back} className="-ml-1 rounded-lg px-1 text-xl leading-none" aria-label="ย้อนกลับ">
          ‹
        </Link>
      )}
      <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
      {right}
    </header>
  );
}

export function QuoteTable({ job }: { job: Job }) {
  const { subtotal, total } = jobTotals(job);
  return (
    <table className="w-full text-sm">
      <tbody>
        {job.items.map((i, idx) => (
          <tr key={idx} className="align-top">
            <td className="py-1 pr-2">
              {i.name}
              <div className="text-xs text-slate-500">
                {i.qty} × {baht(i.unitPrice)}
              </div>
            </td>
            <td className="py-1 text-right whitespace-nowrap">{baht(i.qty * i.unitPrice)}</td>
          </tr>
        ))}
        <tr className="border-t border-slate-200 text-slate-600">
          <td className="pt-2">รวมค่าบริการ</td>
          <td className="pt-2 text-right">{baht(subtotal)}</td>
        </tr>
        {job.travelFee > 0 && (
          <tr className="text-slate-600">
            <td>ค่าเดินทาง</td>
            <td className="text-right">{baht(job.travelFee)}</td>
          </tr>
        )}
        {job.discount > 0 && (
          <tr className="text-rose-600">
            <td>ส่วนลด</td>
            <td className="text-right">-{baht(job.discount)}</td>
          </tr>
        )}
        <tr className="text-base font-bold">
          <td className="pt-1">ยอดสุทธิ</td>
          <td className="pt-1 text-right">{baht(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function Tracker({ job }: { job: Job }) {
  if (job.status === "cancelled" || job.status === "requested") return null;
  const current = TRACK_STEPS.indexOf(job.status);
  const at = (s: JobStatus) => [...job.timeline].reverse().find((t) => t.status === s)?.at;
  return (
    <ol className="space-y-3">
      {TRACK_STEPS.map((s, i) => {
        const done = i <= current;
        const time = at(s);
        return (
          <li key={s} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                done ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-400"
              } ${i === current ? "ring-4 ring-brand-100" : ""}`}
            >
              {done ? "✓" : i + 1}
            </span>
            <div className={done ? "" : "text-slate-400"}>
              <div className="text-sm font-medium">{STATUS_LABEL[s]}</div>
              {time && <div className="text-xs text-slate-500">{fmtDateTime(time)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Photos({ job }: { job: Job }) {
  if (!job.photos.length) return <p className="text-sm text-slate-400">ยังไม่มีรูป</p>;
  return (
    <div className="grid grid-cols-3 gap-2">
      {job.photos.map((p) => (
        <a key={p.file} href={`/api/files/${p.file}`} target="_blank" className="relative block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/${p.file}`} alt={p.kind} className="aspect-square w-full rounded-lg object-cover" />
          <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white">
            {p.kind === "before" ? "ก่อน" : "หลัง"}
          </span>
        </a>
      ))}
    </div>
  );
}
