/**
 * Products Bulk Delete API Route Handler
 * Allows deleting multiple products at once
 * Historical orders and invoices are preserved while product references are removed.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import {
  deleteQRCodeFromImageKit,
  deleteProductImageFromImageKit,
} from "@/lib/imagekit";
import { createAuditLog } from "@/prisma/audit-log";
import { deleteProduct } from "@/prisma/product";

interface SkippedProduct {
  id: string;
  name: string;
}

/**
 * POST /api/products/bulk-delete
 * Delete multiple products by IDs
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "supplier") {
      return NextResponse.json(
        { error: "Suppliers cannot delete products; only admins can." },
        { status: 403 },
      );
    }

    const userId = session.id;
    const body = await request.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: "An array of product IDs is required" },
        { status: 400 },
      );
    }

    // Fetch all products that belong to this user
    const products = await prisma.product.findMany({
      where: {
        id: { in: body.ids },
        userId,
      },
      select: {
        id: true,
        name: true,
        qrCodeFileId: true,
        imageFileId: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No valid products found" },
        { status: 404 },
      );
    }

    const productIds = products.map((p) => p.id);
    const skippedProducts: SkippedProduct[] = [];
    const deletableIds = productIds;

    let deletedCount = 0;
    for (const productId of deletableIds) {
      const product = products.find((item) => item.id === productId);
      if (!product) continue;

      if (product.qrCodeFileId) {
        deleteQRCodeFromImageKit(product.qrCodeFileId).catch((error) => {
          logger.error(
            `Failed to delete QR code from ImageKit for product ${productId}:`,
            error,
          );
        });
      }
      if (product.imageFileId) {
        deleteProductImageFromImageKit(product.imageFileId).catch((error) => {
          logger.error(
            `Failed to delete product image from ImageKit for product ${productId}:`,
            error,
          );
        });
      }

      // Delete from database
      await deleteProduct(productId);

      // Audit log
      createAuditLog({
        userId: session.id,
        action: "delete",
        entityType: "product",
        entityId: productId,
        details: { productName: product.name },
      }).catch(() => {});

      deletedCount++;
    }

    // Cache invalidation
    if (deletedCount > 0) {
      const { invalidateOnProductChange } = await import("@/lib/cache");
      await invalidateOnProductChange().catch((error) => {
        logger.error(
          "Failed to invalidate cache after product bulk deletion:",
          error,
        );
      });
    }

    return NextResponse.json({
      deletedCount,
      skippedProducts,
    });
  } catch (error) {
    logger.error("Error bulk deleting products:", error);
    return NextResponse.json(
      { error: "Failed to delete products. Please try again later." },
      { status: 500 },
    );
  }
}
