/**
 * Repair Order List Component
 * Main component for displaying and managing repair orders
 * Note: Repair orders do NOT affect product stock
 */

"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  useRepairOrders,
  useDeleteRepairOrder,
  useBulkDeleteRepairOrders,
} from "@/hooks/queries";
import { useAuth } from "@/contexts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PhilippinePeso,
  Wrench,
  ShoppingCart,
  Users,
  FileBarChart,
  Trash2,
  Eye,
} from "lucide-react";
import { StatisticsCard } from "@/components/home/StatisticsCard";
import { StatisticsCardSkeleton } from "@/components/home/StatisticsCardSkeleton";
import { RepairOrderDialog } from "./RepairOrderDialog";
import { RepairOrderFilters } from "./RepairOrderFilters";
import { RepairOrderReportDialog } from "./RepairOrderReportDialog";
import { RepairOrderDetailDialog } from "./RepairOrderDetailDialog";
import type { RepairOrder } from "@/types";

const formatCurrency = (value: number) =>
  `₱${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function RepairOrderList() {
  const isMountedRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, isCheckingAuth } = useAuth();
  const { toast } = useToast();

  // Fetch repair orders
  const { data: repairOrders = [], isPending: isLoading } = useRepairOrders();
  const deleteRepairOrderMutation = useDeleteRepairOrder();
  const bulkDeleteMutation = useBulkDeleteRepairOrders();

  // State for dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRepairOrder, setSelectedRepairOrder] =
    useState<RepairOrder | null>(null);

  // State for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState<string>("all");
  const [selectedWarranty, setSelectedWarranty] = useState<string>("all");

  // State for row selection (multi-select)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Mark component as mounted
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      queueMicrotask(() => setIsMounted(true));
    }
  }, []);

  // Filter repair orders
  const filteredRepairOrders = useMemo(() => {
    return repairOrders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.repairOrderNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order.technicianName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTechnician =
        selectedTechnician === "all" ||
        order.technicianName === selectedTechnician;

      const matchesWarranty =
        selectedWarranty === "all" || order.warrantyStatus === selectedWarranty;

      return matchesSearch && matchesTechnician && matchesWarranty;
    });
  }, [repairOrders, searchTerm, selectedTechnician, selectedWarranty]);

  // Get unique technicians for filter
  const uniqueTechnicians = useMemo(() => {
    const technicians = new Set(repairOrders.map((o) => o.technicianName));
    return Array.from(technicians).sort();
  }, [repairOrders]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalOrders = repairOrders.length;
    const totalMaterialsCost = repairOrders.reduce((sum, order) => {
      const orderTotal = order.items.reduce(
        (itemSum, item) => itemSum + item.subtotal,
        0,
      );
      return sum + orderTotal;
    }, 0);

    // This week's stats
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekOrders = repairOrders.filter(
      (o) => new Date(o.createdAt) >= startOfWeek,
    );
    const thisWeekCost = thisWeekOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((itemSum, item) => itemSum + item.subtotal, 0)
      );
    }, 0);

    // Top technician
    const techStats: Array<{
      name: string;
      orderCount: number;
      totalValue: number;
    }> = [];
    repairOrders.forEach((order) => {
      const existing = techStats.find((t) => t.name === order.technicianName);
      if (existing) {
        existing.orderCount += 1;
        existing.totalValue += order.items.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
      } else {
        techStats.push({
          name: order.technicianName,
          orderCount: 1,
          totalValue: order.items.reduce(
            (sum, item) => sum + item.subtotal,
            0,
          ),
        });
      }
    });

    const topTechnician =
      techStats.length > 0
        ? techStats.reduce((max, curr) =>
            curr.orderCount > max.orderCount ? curr : max,
          )
        : null;

    return {
      totalOrders,
      totalMaterialsCost,
      thisWeekOrders: thisWeekOrders.length,
      thisWeekCost,
      topTechnician,
    };
  }, [repairOrders]);

  // Selection handlers
  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAllRows = useCallback(() => {
    setSelectedRows((prev) => {
      if (prev.size === filteredRepairOrders.length) {
        return new Set();
      }
      return new Set(filteredRepairOrders.map((o) => o.id));
    });
  }, [filteredRepairOrders]);

  const allSelected =
    filteredRepairOrders.length > 0 &&
    selectedRows.size === filteredRepairOrders.length;
  const someSelected = selectedRows.size > 0 && !allSelected;

  // Handle view details
  const handleViewDetails = useCallback((order: RepairOrder) => {
    setSelectedRepairOrder(order);
    setDetailDialogOpen(true);
  }, []);

  // Handle single delete
  const handleDelete = useCallback(
    async (order: RepairOrder) => {
      if (
        !confirm(
          `Are you sure you want to delete repair order ${order.repairOrderNumber}?`,
        )
      ) {
        return;
      }
      await deleteRepairOrderMutation.mutateAsync(order.id);
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    },
    [deleteRepairOrderMutation],
  );

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedRows);
    if (
      !confirm(
        `Are you sure you want to delete ${ids.length} repair order(s)?`,
      )
    ) {
      return;
    }
    await bulkDeleteMutation.mutateAsync(ids);
    setSelectedRows(new Set());
  }, [selectedRows, bulkDeleteMutation]);

  // Loading state
  const showSkeleton = !isMounted || isCheckingAuth || isLoading;

  return (
    <div className="flex flex-col poppins">
      {/* Header */}
      <div className="pb-6 flex flex-col items-start text-left">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white pb-2">
          Repair Orders Management
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Track materials used in repairs. Repair orders do not affect product
          inventory.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch pb-6">
        {showSkeleton ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <StatisticsCardSkeleton key={i} />
            ))}
          </>
        ) : (
          <>
            <StatisticsCard
              title="Total Repair Orders"
              value={stats.totalOrders}
              description="All repair orders created"
              icon={Wrench}
              variant="violet"
            />
            <StatisticsCard
              title="Total Materials Cost"
              value={formatCurrency(stats.totalMaterialsCost)}
              description="Total value of materials used"
              icon={PhilippinePeso}
              variant="emerald"
            />
            <StatisticsCard
              title="This Week"
              value={stats.thisWeekOrders}
              description={`${formatCurrency(stats.thisWeekCost)} in materials`}
              icon={ShoppingCart}
              variant="blue"
            />
            <StatisticsCard
              title="Top Technician"
              value={stats.topTechnician?.orderCount ?? 0}
              description={
                stats.topTechnician?.name ?? "No technicians yet"
              }
              icon={Users}
              variant="amber"
              badges={
                stats.topTechnician
                  ? [
                      {
                        label: "Total Value",
                        value: formatCurrency(stats.topTechnician.totalValue),
                      },
                    ]
                  : []
              }
            />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="pb-6 flex justify-center">
        <div className="w-full max-w-9xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Filters */}
          <RepairOrderFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedTechnician={selectedTechnician}
            setSelectedTechnician={setSelectedTechnician}
            selectedWarranty={selectedWarranty}
            setSelectedWarranty={setSelectedWarranty}
            uniqueTechnicians={uniqueTechnicians}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Bulk Delete Button - shown when rows are selected */}
            {selectedRows.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="h-10 flex items-center gap-2 rounded-[28px]"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedRows.size})
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setReportDialogOpen(true)}
              disabled={repairOrders.length === 0}
              className="h-10 flex items-center gap-2 rounded-[28px] border border-amber-400/30 dark:border-amber-400/30 bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-amber-500/10 dark:from-amber-500/25 dark:via-amber-500/15 dark:to-amber-500/10 text-gray-700 dark:text-white shadow-[0_10px_30px_rgba(245,158,11,0.2)] backdrop-blur-sm transition duration-200 hover:border-amber-300/40 hover:from-amber-500/35 hover:via-amber-500/25 hover:to-amber-500/15 dark:hover:border-amber-300/40 dark:hover:from-amber-500/35 dark:hover:via-amber-500/25 dark:hover:to-amber-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileBarChart className="h-4 w-4" />
              Generate Report
            </Button>

            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="h-10 font-semibold inline-flex items-center justify-center rounded-xl border border-violet-400/30 dark:border-violet-400/30 bg-gradient-to-r from-violet-500/40 via-violet-500/30 to-violet-500/20 dark:from-violet-500/40 dark:via-violet-500/30 dark:to-violet-500/20 text-white shadow-[0_15px_35px_rgba(139,92,246,0.35)] backdrop-blur-sm transition duration-200 hover:border-violet-300/50 hover:from-violet-500/50 hover:via-violet-500/40 hover:to-violet-500/30 dark:hover:border-violet-300/50 dark:hover:from-violet-500/50 dark:hover:via-violet-500/40 dark:hover:to-violet-500/30"
            >
              + Create Repair Order
            </Button>
          </div>
        </div>
      </div>

      {/* Repair Orders Table */}
      <div className="pb-6 flex justify-center">
        <div className="w-full max-w-9xl">
          {showSkeleton ? (
            <div className="rounded-2xl border border-violet-400/20 bg-white/50 dark:bg-white/5 p-8 text-center">
              <div className="animate-pulse text-gray-500 dark:text-white/50">
                Loading repair orders...
              </div>
            </div>
          ) : filteredRepairOrders.length === 0 ? (
            <div className="rounded-2xl border border-violet-400/20 bg-white/50 dark:bg-white/5 p-8 text-center">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-white/30" />
              <p className="text-gray-500 dark:text-white/50">
                {repairOrders.length === 0
                  ? "No repair orders yet. Create your first repair order to get started."
                  : "No repair orders match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-violet-400/20">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-violet-500/20 to-violet-500/5 text-left">
                      <th className="px-4 py-3 w-10">
                        <Checkbox
                          checked={
                            allSelected
                              ? true
                              : someSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={() => toggleAllRows()}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-700 dark:text-white/85">
                        Repair Order #
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-700 dark:text-white/85">
                        Technician
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-700 dark:text-white/85">
                        Customer
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-700 dark:text-white/85">
                        Warranty
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-700 dark:text-white/85 text-right">
                        Materials
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-700 dark:text-white/85 text-right">
                        Total Value
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-700 dark:text-white/85">
                        Date
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-700 dark:text-white/85 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRepairOrders.map((order) => {
                      const totalValue = order.items.reduce(
                        (sum, item) => sum + item.subtotal,
                        0,
                      );
                      const totalMaterials = order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      );
                      const isSelected = selectedRows.has(order.id);

                      return (
                        <tr
                          key={order.id}
                          className={`border-t border-gray-200/60 dark:border-white/10 transition-colors ${
                            isSelected
                              ? "bg-violet-500/10 dark:bg-violet-500/15"
                              : "hover:bg-violet-500/5 dark:hover:bg-violet-500/10"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                toggleRowSelection(order.id)
                              }
                              aria-label={`Select ${order.repairOrderNumber}`}
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                            {order.repairOrderNumber}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-white/80">
                            {order.technicianName}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-white/80">
                            {order.customerName}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                order.warrantyStatus === "IN_WARRANTY"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {order.warrantyStatus === "IN_WARRANTY"
                                ? "In Warranty"
                                : "Out of Warranty"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-white/80">
                            {totalMaterials} items
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalValue)}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-white/60">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                onClick={() => handleViewDetails(order)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => handleDelete(order)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      {isMounted && (
        <RepairOrderDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      )}

      {/* Report Dialog */}
      {isMounted && (
        <RepairOrderReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          repairOrders={repairOrders}
        />
      )}

      {/* Detail Dialog */}
      {isMounted && (
        <RepairOrderDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          repairOrder={selectedRepairOrder}
        />
      )}
    </div>
  );
}
