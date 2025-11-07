"use client";

import dynamic from "next/dynamic";

// ✅ Disable SSR for this client-only page
const CollectorDashboardClient = dynamic(
  () => import("./CollectorDashboardClient"),
  { ssr: false }
);

export default function CollectorPage() {
  return <CollectorDashboardClient />;
}
