import type { Job, JobItem } from "./types";

export function itemsSubtotal(items: JobItem[]) {
  return items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
}

export function jobTotals(job: Pick<Job, "items" | "travelFee" | "discount">) {
  const subtotal = itemsSubtotal(job.items);
  const total = Math.max(0, subtotal + job.travelFee - job.discount);
  return { subtotal, total };
}

export const baht = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ฿";
