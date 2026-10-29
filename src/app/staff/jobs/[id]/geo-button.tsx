"use client";

import { useTransition } from "react";
import { staffCheckIn, staffComplete } from "@/app/actions";

/** ขอตำแหน่ง GPS ก่อนเรียก action (ถ้าไม่อนุญาตตำแหน่งจะบันทึกโดยไม่มีพิกัด) */
export function GeoButton(props: { jobId: string; mode: "checkin" | "complete"; label: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const run = (lat?: number, lng?: number) =>
    start(async () => {
      try {
        await (props.mode === "checkin" ? staffCheckIn : staffComplete)(props.jobId, lat, lng);
      } catch (e) {
        alert((e as Error).message);
      }
    });

  const onClick = () => {
    if (!navigator.geolocation) return run();
    navigator.geolocation.getCurrentPosition(
      (p) => run(p.coords.latitude, p.coords.longitude),
      () => run(),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <button type="button" onClick={onClick} disabled={pending || props.disabled} className="btn-primary w-full">
      {pending ? "กำลังบันทึก…" : props.label}
    </button>
  );
}
