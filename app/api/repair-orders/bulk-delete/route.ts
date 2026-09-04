/**
 * Repair Orders Bulk Delete API Route Handler
 * Allows deleting multiple repair orders at once
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";

/**
 * POST /api/repair-orders/bulk-delete
 * Delete multiple repair orders by IDs
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
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

    const userId = session.id;
    const body = await request.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: "An array of repair order IDs is required" },
        { status: 400 },
      );
    }

    // Delete repair orders that belong to the current user
    const result = await prisma.repairOrder.deleteMany({
      where: {
        id: { in: body.ids },
        createdBy: userId, // Ensure user can only delete their own repair orders
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    logger.error("Error bulk deleting repair orders:", error);
    return NextResponse.json(
      { error: "Failed to delete repair orders" },
      { status: 500 },
    );
  }
}
