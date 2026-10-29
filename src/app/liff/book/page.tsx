import { PageHeader } from "@/components/ui";
import { getSettings, listServices } from "@/lib/db";
import { requireRole } from "@/lib/session";
import BookingForm from "./booking-form";

export default async function BookPage(props: PageProps<"/liff/book">) {
  const user = await requireRole("customer");
  const { cat } = await props.searchParams;
  const [services, settings] = await Promise.all([listServices(), getSettings()]);
  const category = cat === "cleaning" ? "cleaning" : "aircon";

  return (
    <>
      <PageHeader title="จองบริการ" back="/liff" />
      <BookingForm
        key={category}
        category={category}
        services={services.filter((s) => s.active)}
        travelFee={settings.travelFeeBase}
        defaultAddress={user.address ?? ""}
        defaultPhone={user.phone}
      />
    </>
  );
}
