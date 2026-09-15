/**
 * Repair Order Detail Dialog Component
 * Displays detailed information about a repair order
 */

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wrench, User, Users, FileText } from "lucide-react";
import type { RepairOrder } from "@/types";

const formatCurrency = (value: number) =>
  `₱${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface RepairOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairOrder: RepairOrder | null;
}

export function RepairOrderDetailDialog({
  open,
  onOpenChange,
  repairOrder,
}: RepairOrderDetailDialogProps) {
  if (!repairOrder) return null;

  const totalValue = repairOrder.items.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );
  const totalQuantity = repairOrder.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[28px] border border-violet-400/20 bg-white/95 dark:bg-popover/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Wrench className="h-5 w-5 text-violet-500" />
            Repair Order Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-white/60">
                Repair Order Number
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {repairOrder.repairOrderNumber}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-white/60">Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {new Date(repairOrder.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-transparent p-4">
            <p className="text-sm text-gray-500 dark:text-white/60">Warranty Status</p>
            <p className="mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              {repairOrder.warrantyStatus === "IN_WARRANTY" ? "In Warranty" : "Out of Warranty"}
            </p>
          </div>

          {/* Technician and Customer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-violet-500" />
                <p className="text-sm text-gray-500 dark:text-white/60">
                  Technician
                </p>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {repairOrder.technicianName}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-gray-500 dark:text-white/60">
                  Customer
                </p>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {repairOrder.customerName}
              </p>
            </div>
          </div>

          {/* Materials Used */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Materials Used ({repairOrder.items.length} items, {totalQuantity}{" "}
              total qty)
            </h4>
            <div className="overflow-hidden rounded-xl border border-violet-400/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-500/15 to-violet-500/5 text-left">
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85">
                      Product
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85">
                      SKU
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">
                      Qty
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">
                      Price
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {repairOrder.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-gray-200/60 dark:border-white/10"
                    >
                      <td className="px-4 py-2 font-medium text-gray-800 dark:text-white/90">
                        {item.productName}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-white/60">
                        {item.sku || "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-white/80">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-white/80">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200/60 dark:border-white/10 bg-gradient-to-r from-violet-500/10 to-transparent">
                    <td
                      colSpan={4}
                      className="px-4 py-2 font-semibold text-gray-800 dark:text-white/90 text-right"
                    >
                      Total:
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {repairOrder.notes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-2">
                Notes
              </h4>
              <p className="text-gray-700 dark:text-white/80 p-3 rounded-xl border border-violet-400/20 bg-white/50 dark:bg-white/5">
                {repairOrder.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
