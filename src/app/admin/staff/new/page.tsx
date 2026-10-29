import { listServices } from "@/lib/db";
import { StaffForm } from "../staff-form";

export default async function NewStaff() {
  const services = await listServices();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">เพิ่มพนักงาน / Supplier</h1>
      <StaffForm services={services} />
    </div>
  );
}
