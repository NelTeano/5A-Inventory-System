/**
 * Repair Orders Page Component
 * Client-side wrapper for the repair orders page
 */

"use client";

import dynamic from "next/dynamic";

const RepairOrderList = dynamic(
  () =>
    import("@/components/repair-orders/RepairOrderList").then((mod) => ({
      default: mod.RepairOrderList,
    })),
  {
    ssr: false,
  },
);

export default function RepairOrdersPage() {
  return <RepairOrderList />;
}
