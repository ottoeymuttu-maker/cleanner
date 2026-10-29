import Link from "next/link";
import { notFound } from "next/navigation";
import { Stars, StatusBadge } from "@/components/ui";
import { getUser, listJobs } from "@/lib/db";
import { fmtDateTime } from "@/lib/status";
import { StaffForm } from "../staff-form";

export default async function StaffProfile(props: PageProps<"/admin/staff/[id]">) {
  const { id } = await props.params;
  const user = await getUser(id);
  if (!user || user.role !== "staff") notFound();
  const jobs = (await listJobs()).filter((j) => j.staffIds.includes(id));

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-bold">{user.name}</h1>
      <StaffForm user={user} />
      <section className="card">
        <h2 className="mb-3 font-semibold">ประวัติงาน ({jobs.length})</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center justify-between py-2">
              <Link href={`/admin/jobs/${j.id}`} className="text-brand-700 underline">{j.code}</Link>
              <span className="text-slate-500">{fmtDateTime(j.scheduledAt)}</span>
              {j.review ? <Stars rating={j.review.rating} /> : <span className="w-16" />}
              <StatusBadge status={j.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
