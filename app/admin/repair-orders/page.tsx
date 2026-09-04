import { getSession } from "@/lib/auth-server";
import RepairOrdersPage from "@/components/Pages/RepairOrdersPage";

/**
 * Admin Repair Orders page
 * Only admin users can access this page
 * Repair orders do NOT affect product stock
 */
export default async function AdminRepairOrdersPage() {
  const user = await getSession();
  if (!user) return null;
  return <RepairOrdersPage />;
}
