import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ทุกหน้าขึ้นกับผู้ใช้ที่ login จึงเรนเดอร์แบบ dynamic ทั้งหมด
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
