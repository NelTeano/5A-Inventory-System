/**
 * Repair Order Prisma Utilities
 * Helper functions for repair order database operations
 * Note: Repair orders do NOT affect product stock/quantity
 */

import { prisma } from "@/prisma/client";
import { Prisma } from "@prisma/client";
import type { CreateRepairOrderInput } from "@/types/repair-order";

const MAX_REPAIR_ORDER_CREATE_ATTEMPTS = 5;

/**
 * Generate unique repair order number
 * Format: RO-YYYY-MMDD-XXXX (e.g., RO-2024-0116-0001)
 *
 * Sequence is derived from the highest existing number for today
 * (not a count), so deletions leave gaps that are safely skipped
 * instead of producing duplicate numbers.
 *
 * @returns Promise<string> - Unique repair order number
 */
export async function generateRepairOrderNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const prefix = `RO-${year}-${month}${day}-`;

  const existingOrders = await prisma.repairOrder.findMany({
    where: {
      repairOrderNumber: {
        startsWith: prefix,
      },
    },
    select: {
      repairOrderNumber: true,
    },
  });

  let maxSequence = 0;
  for (const order of existingOrders) {
    const sequence = Number.parseInt(
      order.repairOrderNumber.slice(prefix.length),
      10,
    );
    if (!Number.isNaN(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  const sequence = String(maxSequence + 1).padStart(4, "0");
  return `${prefix}${sequence}`;
}

/**
 * Create a new repair order with items
 * IMPORTANT: This does NOT affect product stock - it's purely for record-keeping
 *
 * @param data - Repair order creation data
 * @param userId - User ID creating the repair order (admin only)
 * @returns Promise<RepairOrder> - Created repair order with items
 */
export async function createRepairOrder(
  data: CreateRepairOrderInput,
  userId: string,
) {
  // Calculate totals and prepare items (product snapshots)
  let totalValue = 0;
  const orderItemsData = [];

  for (const item of data.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    // Price is snapshotted from current product price (no stock check)
    const price = Number(product.price);
    const lineSubtotal = price * item.quantity;
    totalValue += lineSubtotal;

    orderItemsData.push({
      productId: item.productId,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      price,
      subtotal: lineSubtotal,
    });
  }

  // Create repair order with items, retrying if the generated number
  // races with a concurrent create (unique constraint violation)
  for (let attempt = 1; attempt <= MAX_REPAIR_ORDER_CREATE_ATTEMPTS; attempt++) {
    const repairOrderNumber = await generateRepairOrderNumber();

    try {
      const repairOrder = await prisma.repairOrder.create({
        data: {
          repairOrderNumber,
          technicianName: data.technicianName,
          customerName: data.customerName,
          warrantyStatus: data.warrantyStatus || "OUT_OF_WARRANTY",
          notes: data.notes || null,
          createdBy: userId,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return repairOrder;
    } catch (error) {
      const isDuplicateNumber =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target === undefined ||
          (Array.isArray(error.meta?.target)
            ? error.meta.target.includes("repairOrderNumber")
            : error.meta?.target === "repairOrderNumber"));

      if (!isDuplicateNumber || attempt === MAX_REPAIR_ORDER_CREATE_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error("Failed to generate a unique repair order number");
}

/**
 * Get all repair orders for a user
 * Only admin users can access repair orders
 *
 * @param userId - User ID (must be admin)
 * @returns Promise<RepairOrder[]> - Array of repair orders
 */
export async function getRepairOrdersByUser(userId: string) {
  return prisma.repairOrder.findMany({
    where: { createdBy: userId },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Get repair order by ID
 * Only the creator (admin) can access their repair orders
 *
 * @param repairOrderId - Repair Order ID
 * @param userId - User ID (for authorization check)
 * @returns Promise<RepairOrder | null> - Repair order or null if not found
 */
export async function getRepairOrderById(
  repairOrderId: string,
  userId: string,
) {
  return prisma.repairOrder.findFirst({
    where: {
      id: repairOrderId,
      createdBy: userId, // Ensure user can only access their own repair orders
    },
    include: {
      items: true,
    },
  });
}

/**
 * Delete a repair order
 * Only the creator (admin) can delete their repair orders
 *
 * @param repairOrderId - Repair Order ID
 * @param userId - User ID (for authorization)
 * @returns Promise<void>
 */
export async function deleteRepairOrder(
  repairOrderId: string,
  userId: string,
) {
  // Check if repair order exists and belongs to user
  const existingOrder = await prisma.repairOrder.findFirst({
    where: {
      id: repairOrderId,
      createdBy: userId,
    },
  });

  if (!existingOrder) {
    throw new Error("Repair order not found or unauthorized");
  }

  // Delete repair order (cascade delete will remove items)
  await prisma.repairOrder.delete({
    where: { id: repairOrderId },
  });
}
