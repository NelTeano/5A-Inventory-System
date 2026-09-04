/**
 * Repair Order type definitions
 * Used for tracking materials used in repairs without affecting product stock
 */

/**
 * Repair order item interface
 * Represents a single material/product used in a repair
 */
export interface RepairOrderItem {
  id: string;
  repairOrderId: string;
  productId: string;
  productName: string;
  sku?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  createdAt: Date;
}

/**
 * Repair order interface
 * Matches Prisma RepairOrder model
 */
export interface RepairOrder {
  id: string;
  repairOrderNumber: string;
  technicianName: string;
  customerName: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  createdBy: string;
  items: RepairOrderItem[];
}

/**
 * Create repair order input
 * Used when creating a new repair order
 */
export interface CreateRepairOrderInput {
  technicianName: string;
  customerName: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  notes?: string;
}

/**
 * Repair order filters
 * Used for filtering repair orders in list view
 */
export interface RepairOrderFilters {
  technicianName?: string;
  customerName?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

/**
 * Repair order report row
 * Used for daily/weekly report aggregation
 */
export interface RepairOrderReportRow {
  technicianName: string;
  date: string;
  totalOrders: number;
  totalMaterials: number;
  totalQuantity: number;
  totalValue: number;
  materials: Array<{
    productName: string;
    sku: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
}

/**
 * Repair order report summary
 */
export interface RepairOrderReportSummary {
  totalOrders: number;
  totalMaterialsCost: number;
  totalQuantity: number;
  technicianCount: number;
  topTechnician: {
    name: string;
    orderCount: number;
    totalValue: number;
  } | null;
}
