/**
 * Repair Orders API Route Handler
 * App Router route handler for repair order CRUD operations
 * Note: Repair orders do NOT affect product stock
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import {
  createRepairOrder,
  getRepairOrdersByUser,
} from "@/prisma/repair-order";
import { CreateRepairOrderInput } from "@/types/repair-order";

/**
 * GET /api/repair-orders
 * Fetch all repair orders for the authenticated admin user
 */
export async function GET(request: NextRequest) {
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

    const userId = session.id;

    // Fetch repair orders from database
    const repairOrders = await getRepairOrdersByUser(userId);

    // Transform for response
    const transformedOrders = repairOrders.map((order) => ({
      id: order.id,
      repairOrderNumber: order.repairOrderNumber,
      technicianName: order.technicianName,
      customerName: order.customerName,
      warrantyStatus: order.warrantyStatus ?? "OUT_OF_WARRANTY",
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt?.toISOString() || null,
      createdBy: order.createdBy,
      items: order.items.map((item) => ({
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
    }));

    return NextResponse.json(transformedOrders);
  } catch (error) {
    logger.error("Error fetching repair orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch repair orders" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/repair-orders
 * Create a new repair order
 * Note: This does NOT affect product stock - it's purely for record-keeping
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin users can create repair orders
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admin users can create repair orders" },
        { status: 403 },
      );
    }

    const userId = session.id;
    const body = await request.json();

    // Validate required fields
    if (!body.technicianName || !body.customerName) {
      return NextResponse.json(
        { error: "Technician name and customer name are required" },
        { status: 400 },
      );
    }

    const warrantyStatus =
      body.warrantyStatus === "IN_WARRANTY" ||
      body.warrantyStatus === "OUT_OF_WARRANTY"
        ? body.warrantyStatus
        : "OUT_OF_WARRANTY";

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one material/item is required" },
        { status: 400 },
      );
    }

    // Validate each item
    for (const item of body.items) {
      if (
        !item.productId ||
        (item.quantity !== undefined &&
          (!Number.isInteger(item.quantity) || item.quantity < 0))
      ) {
        return NextResponse.json(
          { error: "Each item must have a valid productId and non-negative quantity" },
          { status: 400 },
        );
      }
    }

    const repairOrderData: CreateRepairOrderInput = {
      technicianName: body.technicianName,
      customerName: body.customerName,
      warrantyStatus,
      items: body.items.map((item: { productId: string; quantity?: number }) => ({
        productId: item.productId,
        quantity: item.quantity ?? 0,
      })),
      notes: body.notes,
    };

    // Create repair order
    const repairOrder = await createRepairOrder(repairOrderData, userId);

    // Transform for response
    const transformedOrder = {
      id: repairOrder.id,
      repairOrderNumber: repairOrder.repairOrderNumber,
      technicianName: repairOrder.technicianName,
      customerName: repairOrder.customerName,
      warrantyStatus: repairOrder.warrantyStatus,
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

    return NextResponse.json(transformedOrder, { status: 201 });
  } catch (error) {
    logger.error("Error creating repair order:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create repair order",
      },
      { status: 500 },
    );
  }
}
