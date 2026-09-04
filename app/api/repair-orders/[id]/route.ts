/**
 * Repair Order Detail API Route Handler
 * App Router route handler for individual repair order operations (GET, DELETE)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import {
  getRepairOrderById,
  deleteRepairOrder,
} from "@/prisma/repair-order";

/**
 * GET /api/repair-orders/:id
 * Get repair order details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin users can access repair orders
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admin users can access repair orders" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const userId = session.id;

    const repairOrder = await getRepairOrderById(id, userId);

    if (!repairOrder) {
      return NextResponse.json(
        { error: "Repair order not found" },
        { status: 404 },
      );
    }

    // Transform for response
    const transformedOrder = {
      id: repairOrder.id,
      repairOrderNumber: repairOrder.repairOrderNumber,
      technicianName: repairOrder.technicianName,
      customerName: repairOrder.customerName,
      notes: repairOrder.notes,
      createdAt: repairOrder.createdAt.toISOString(),
      updatedAt: repairOrder.updatedAt?.toISOString() || null,
      createdBy: repairOrder.createdBy,
      items: repairOrder.items.map((item) => ({
        id: item.id,
        repairOrderId: item.repairOrderId,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        createdAt: item.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(transformedOrder);
  } catch (error) {
    logger.error("Error fetching repair order:", error);
    return NextResponse.json(
      { error: "Failed to fetch repair order" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/repair-orders/:id
 * Delete a repair order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin users can delete repair orders
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admin users can delete repair orders" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const userId = session.id;

    await deleteRepairOrder(id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting repair order:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete repair order",
      },
      { status: 500 },
    );
  }
}
