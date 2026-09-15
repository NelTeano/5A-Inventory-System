"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { PaginationType } from "@/components/shared/PaginationSelector";
import { createProductColumns } from "./ProductTableColumns";
import { useAuth } from "@/contexts";
import {
  useProducts,
  useCategories,
  useSuppliers,
  useOrders,
  useDashboard,
  useSupplierPortalDashboard,
  useBulkDeleteProducts,
} from "@/hooks/queries";
import ProductFilters from "./ProductFilters";
import { StatisticsCard } from "@/components/home/StatisticsCard";
import { StatisticsCardSkeleton } from "@/components/home/StatisticsCardSkeleton";
import { AnalyticsCard } from "@/components/ui/analytics-card";
import { AnalyticsCardSkeleton } from "@/components/ui/analytics-card-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, PhilippinePeso, Truck, FolderTree, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ProductTable = dynamic(
  () =>
    import("./ProductTable").then((mod) => ({
      default: mod.ProductTable,
    })),
  {
    ssr: true,
  },
);
//import { ColumnFiltersState } from "@tanstack/react-table";

const ProductList = React.memo(() => {
  // Track if component has mounted on client to prevent hydration mismatch
  const isMountedRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  const pathname = usePathname();
  const { user, isCheckingAuth } = useAuth();
  const isAdminProducts = pathname?.startsWith("/admin") ?? false;
  /** Show store-wide state cards only for admin/user on /products (not for client/supplier) */
  const isUserProductsPage =
    pathname === "/products" &&
    user?.role !== "client" &&
    user?.role !== "supplier";
  /** Show state cards on admin products page (/admin/products), same style as admin/orders */
  const isAdminProductsPage = pathname === "/admin/products";

  // Use TanStack Query for data fetching
  const productsQuery = useProducts();
  const categoriesQuery = useCategories();
  const suppliersQuery = useSuppliers();
  const ordersQuery = useOrders();
  const dashboardQuery = useDashboard();
  const supplierPortalQuery = useSupplierPortalDashboard();

  const allProducts = productsQuery.data ?? [];
  const allCategories = categoriesQuery.data ?? [];
  const allSuppliers = suppliersQuery.data ?? [];
  const allOrders = ordersQuery.data ?? [];
  const dashboard = isAdminProducts ? (dashboardQuery.data ?? null) : null;
  /** Dashboard stats for products-page cards (only when on /products) */
  const productsPageStats = isUserProductsPage
    ? (dashboardQuery.data ?? null)
    : null;

  const detailBase = isAdminProducts ? "/admin" : "";
  /** Supplier on /products: show Product Owner column instead of Supplier, and supplier header */
  const isSupplierProductsPage =
    pathname === "/products" && user?.role === "supplier";

  // Mark component as mounted after client-side hydration
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      queueMicrotask(() => setIsMounted(true));
    }
  }, []);

  // State for column filters, search term, and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<PaginationType>({
    pageIndex: 0,
    pageSize: 8,
  });

  // State for selected filters
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  // Row selection state for bulk operations
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const bulkDeleteMutation = useBulkDeleteProducts();

  // Selection helpers
  const selectedRows = useMemo(
    () => new Set(Object.keys(rowSelection).filter((k) => rowSelection[k])),
    [rowSelection],
  );

  // Filtered product IDs for select-all
  const filteredProductIds = useMemo(() => {
    return allProducts
      .filter((product) => {
        const searchMatch =
          !searchTerm ||
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch =
          selectedCategory.length === 0 ||
          selectedCategory.includes(product.categoryId ?? "");
        const supplierMatch =
          selectedSuppliers.length === 0 ||
          selectedSuppliers.includes(product.supplierId ?? "");
        const statusMatch =
          selectedStatuses.length === 0 ||
          selectedStatuses.includes(product.status ?? "");
        return searchMatch && categoryMatch && supplierMatch && statusMatch;
      })
      .map((p) => p.id);
  }, [allProducts, searchTerm, selectedCategory, selectedSuppliers, selectedStatuses]);

  const allSelected =
    filteredProductIds.length > 0 &&
    filteredProductIds.every((id) => selectedRows.has(id));
  const someSelected =
    selectedRows.size > 0 &&
    !allSelected &&
    filteredProductIds.some((id) => selectedRows.has(id));

  const toggleRowSelection = useCallback((id: string) => {
    setRowSelection((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }, []);

  const toggleAllRows = useCallback(() => {
    setRowSelection((prev) => {
      if (filteredProductIds.every((id) => prev[id])) {
        // Deselect all filtered rows
        const next = { ...prev };
        for (const id of filteredProductIds) {
          delete next[id];
        }
        return next;
      }
      // Select all filtered rows
      const next = { ...prev };
      for (const id of filteredProductIds) {
        next[id] = true;
      }
      return next;
    });
  }, [filteredProductIds]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedRows);
    if (
      !confirm(
        `Are you sure you want to delete ${ids.length} product(s)?`,
      )
    ) {
      return;
    }
    await bulkDeleteMutation.mutateAsync(ids);
    setRowSelection({});
  }, [selectedRows, bulkDeleteMutation]);

  const columns = useMemo(
    () =>
      createProductColumns(detailBase, {
        forSupplier: isSupplierProductsPage,
        selectedRows,
        onToggleRow: toggleRowSelection,
        onToggleAll: toggleAllRows,
        allSelected,
        someSelected,
      }),
    [
      detailBase,
      isSupplierProductsPage,
      selectedRows,
      toggleRowSelection,
      toggleAllRows,
      allSelected,
      someSelected,
    ],
  );

  // Removed debug log - use React DevTools for debugging

  const formatCurrency = (value: number) =>
    `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Determine loading state - FIXES HYDRATION & FLICKER
  const productsQueryPending = productsQuery.isPending;
  const ordersQueryPending = ordersQuery.isPending;
  const dashboardQueryPending = isAdminProducts && dashboardQuery.isPending;
  const showSkeleton = !isMounted || isCheckingAuth || productsQueryPending;
  const showCardsSkeleton =
    showSkeleton ||
    (isAdminProducts
      ? dashboardQueryPending || ordersQueryPending
      : ordersQueryPending);
  /** For /products page cards: show skeleton until mounted and dashboard loaded */
  const productsPageCardsLoading =
    isUserProductsPage && (!isMounted || dashboardQuery.isPending);
  /** For /admin/products page cards: show skeleton until mounted and dashboard loaded */
  const adminProductsCardsLoading =
    isAdminProductsPage && (!isMounted || dashboardQuery.isPending);
  /** For supplier /products page cards: show skeleton until mounted and portal dashboard loaded */
  const supplierProductsCardsLoading =
    isSupplierProductsPage &&
    (!isMounted || isCheckingAuth || supplierPortalQuery.isPending);

  // Summary stats from products and orders (updates on CRUD via query invalidation)
  const productStats = useMemo(() => {
    const total = allProducts.length;
    const available = allProducts.filter(
      (p) =>
        (p.status || "").toLowerCase().replace(/\s+/g, "_") === "available",
    ).length;
    const stockLow = allProducts.filter(
      (p) =>
        (p.status || "").toLowerCase().replace(/\s+/g, "_") === "stock_low",
    ).length;
    const stockOut = allProducts.filter(
      (p) =>
        (p.status || "").toLowerCase().replace(/\s+/g, "_") === "stock_out",
    ).length;
    const totalValue = allProducts.reduce(
      (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
      0,
    );
    return { total, available, stockLow, stockOut, totalValue };
  }, [allProducts]);

  const orderStats = useMemo(() => {
    const total = allOrders.length;
    const paidOrders = allOrders.filter(
      (o) => (o.paymentStatus || "").toLowerCase() === "paid",
    );
    const paid = paidOrders.length;
    const unpaid = allOrders.filter(
      (o) =>
        (o.paymentStatus || "").toLowerCase() === "unpaid" ||
        (o.paymentStatus || "").toLowerCase() === "partial",
    ).length;
    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + (Number(o.total) || 0),
      0,
    );
    const pending = allOrders.filter(
      (o) => (o.status || "").toLowerCase() === "pending",
    ).length;
    const confirmed = allOrders.filter(
      (o) => (o.status || "").toLowerCase() === "confirmed",
    ).length;
    const shipping = allOrders.filter(
      (o) =>
        (o.status || "").toLowerCase() === "shipped" ||
        (o.status || "").toLowerCase() === "processing",
    ).length;
    const refunded = allOrders.filter(
      (o) => (o.paymentStatus || "").toLowerCase() === "refunded",
    ).length;
    const cancelled = allOrders.filter(
      (o) => (o.status || "").toLowerCase() === "cancelled",
    ).length;
    return {
      total,
      paid,
      unpaid,
      totalRevenue,
      pending,
      confirmed,
      shipping,
      refunded,
      cancelled,
    };
  }, [allOrders]);

  const cardVariantClasses = {
    violet:
      "border-violet-400/30 bg-gradient-to-br from-violet-500/25 via-violet-500/10 to-violet-500/5 shadow-[0_20px_50px_rgba(139,92,246,0.25)] dark:shadow-[0_20px_50px_rgba(139,92,246,0.15)]",
    emerald:
      "border-emerald-400/30 bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-emerald-500/5 shadow-[0_20px_50px_rgba(16,185,129,0.25)] dark:shadow-[0_20px_50px_rgba(16,185,129,0.15)]",
    amber:
      "border-amber-400/30 bg-gradient-to-br from-amber-500/30 via-amber-500/15 to-amber-500/5 shadow-[0_20px_50px_rgba(245,158,11,0.2)] dark:shadow-[0_20px_50px_rgba(245,158,11,0.12)]",
    blue: "border-blue-400/30 bg-gradient-to-br from-blue-500/25 via-blue-500/10 to-blue-500/5 shadow-[0_20px_50px_rgba(59,130,246,0.25)] dark:shadow-[0_20px_50px_rgba(59,130,246,0.15)]",
  };

  return (
    <div className="flex flex-col poppins">
      {/* Product Inventory Section Header — supplier sees own products + Product Owner; admin/user sees full copy */}
      <div className="pb-6 flex flex-col items-start text-left">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white pb-2">
          {isSupplierProductsPage
            ? "My Products"
            : "Product Inventory Management"}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {isSupplierProductsPage
            ? "Products supplied by you. View stock, categories, and which store owner manages each product. Use filters and search to find items quickly."
            : "Efficiently manage your product catalog with advanced filtering, search capabilities, and real-time stock tracking. Monitor inventory levels, organize by categories and suppliers, and maintain optimal stock control."}
        </p>
      </div>

      {/* Supplier /products page state cards — 4 per row */}
      {isSupplierProductsPage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch pb-6">
          {supplierProductsCardsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <StatisticsCardSkeleton key={i} />
              ))}
            </>
          ) : supplierPortalQuery.data ? (
            (() => {
              const d = supplierPortalQuery.data;
              const nonCancelledOrders = Math.max(
                0,
                d.totalOrders - (d.orderStatusCounts?.cancelled ?? 0),
              );
              const avgOrder =
                nonCancelledOrders > 0
                  ? d.totalRevenue / nonCancelledOrders
                  : 0;
              return (
                <>
                  <StatisticsCard
                    title="Total Products"
                    value={d.totalProducts}
                    description="Products in your catalog"
                    icon={Package}
                    variant="rose"
                    badges={[
                      {
                        label: "Available",
                        value: d.productStatusCounts?.available ?? 0,
                      },
                      {
                        label: "Stock low",
                        value: d.productStatusCounts?.stockLow ?? 0,
                      },
                      {
                        label: "Stock out",
                        value: d.productStatusCounts?.stockOut ?? 0,
                      },
                    ]}
                  />
                  <StatisticsCard
                    title="Product Value"
                    value={formatCurrency(d.productValue ?? 0)}
                    description="Total Product value assigned by owner"
                    icon={PhilippinePeso}
                    variant="violet"
                    badges={[
                      {
                        label: "Orders",
                        value: formatCurrency(d.valueBreakdown?.orders ?? 0),
                      },
                      {
                        label: "Invoices",
                        value: formatCurrency(d.valueBreakdown?.invoices ?? 0),
                      },
                      {
                        label: "Due",
                        value: formatCurrency(d.valueBreakdown?.due ?? 0),
                      },
                      {
                        label: "Cancelled",
                        value: formatCurrency(d.valueBreakdown?.cancelled ?? 0),
                      },
                      {
                        label: "Refunded",
                        value: formatCurrency(d.valueBreakdown?.refunded ?? 0),
                      },
                    ]}
                  />
                  <StatisticsCard
                    title="Total Orders"
                    value={d.totalOrders}
                    description="Orders containing your products"
                    icon={Truck}
                    variant="emerald"
                    badges={[
                      {
                        label: "Pending",
                        value: d.orderStatusCounts?.pending ?? 0,
                      },
                      {
                        label: "In progress",
                        value: d.orderStatusCounts?.inProgress ?? 0,
                      },
                      {
                        label: "Shipped",
                        value: d.orderStatusCounts?.shipped ?? 0,
                      },
                      {
                        label: "Delivered",
                        value: d.orderStatusCounts?.delivered ?? 0,
                      },
                      {
                        label: "Refunded",
                        value: d.orderStatusCounts?.refunded ?? 0,
                      },
                      {
                        label: "Cancelled",
                        value: d.orderStatusCounts?.cancelled ?? 0,
                      },
                    ]}
                  />
                  <StatisticsCard
                    title="Total Revenue"
                    value={formatCurrency(d.totalRevenue ?? 0)}
                    description="Revenue from your products (excl. cancelled)"
                    icon={PhilippinePeso}
                    variant="amber"
                    badges={[
                      {
                        label: "Paid",
                        value: formatCurrency(d.revenueBreakdown?.paid ?? 0),
                      },
                      {
                        label: "Due",
                        value: formatCurrency(d.revenueBreakdown?.due ?? 0),
                      },
                      {
                        label: "Refund",
                        value: formatCurrency(d.revenueBreakdown?.refund ?? 0),
                      },
                      {
                        label: "Pending",
                        value: formatCurrency(d.revenueBreakdown?.pending ?? 0),
                      },
                      {
                        label: "Avg/Order",
                        value: formatCurrency(avgOrder),
                      },
                    ]}
                  />
                </>
              );
            })()
          ) : null}
        </div>
      )}

      {/* Admin products page state cards — same layout as admin/orders (2x2) */}
      {isAdminProductsPage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 pb-6 items-stretch">
          {adminProductsCardsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <StatisticsCardSkeleton key={i} />
              ))}
            </>
          ) : dashboard ? (
            <>
              <StatisticsCard
                title="Total Products"
                value={dashboard.counts.products}
                description="Products availability"
                icon={Package}
                variant="rose"
                badges={[
                  {
                    label: "Available",
                    value: dashboard.productStatusBreakdown?.available ?? 0,
                  },
                  {
                    label: "Stock low",
                    value: dashboard.productStatusBreakdown?.stockLow ?? 0,
                  },
                  {
                    label: "Stock out",
                    value: dashboard.productStatusBreakdown?.stockOut ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title="Total Value"
                value={formatCurrency(dashboard.totalInventoryValue ?? 0)}
                description="Total inventory value"
                icon={PhilippinePeso}
                variant="violet"
                badges={[
                  {
                    label: "Orders",
                    value: formatCurrency(
                      dashboard.orderAnalytics
                        ?.totalRevenueExcludingCancelled ??
                        dashboard.revenue?.fromOrders ??
                        0,
                    ),
                  },
                  {
                    label: "Invoices",
                    value: formatCurrency(dashboard.revenue?.fromInvoices ?? 0),
                  },
                  {
                    label: "Due",
                    value: formatCurrency(
                      dashboard.invoiceAnalytics?.outstandingAmount ?? 0,
                    ),
                  },
                  {
                    label: "Cancelled",
                    value: formatCurrency(
                      dashboard.orderAnalytics?.cancelledOrderAmount ?? 0,
                    ),
                  },
                ]}
                expandableSections={[
                  {
                    title: `Breakdown by supplier (${dashboard.supplierValues?.length ?? 0})`,
                    items:
                      dashboard.supplierValues?.map((sv) => ({
                        label: sv.supplierName,
                        value: formatCurrency(sv.value),
                      })) ?? [],
                  },
                  {
                    title: `Breakdown by category (${dashboard.categoryValues?.length ?? 0})`,
                    items:
                      dashboard.categoryValues?.map((cv) => ({
                        label: cv.categoryName,
                        value: formatCurrency(cv.value),
                      })) ?? [],
                  },
                ]}
              />
              <StatisticsCard
                title="Total Suppliers"
                value={dashboard.counts.suppliers}
                description="Suppliers"
                icon={Truck}
                variant="emerald"
                badges={[
                  {
                    label: "Active",
                    value: dashboard.supplierStatusBreakdown?.active ?? 0,
                  },
                  {
                    label: "Inactive",
                    value: dashboard.supplierStatusBreakdown?.inactive ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title="Categories"
                value={dashboard.counts.categories}
                description="Product categories"
                icon={FolderTree}
                variant="amber"
                badges={[
                  {
                    label: "Active",
                    value: dashboard.categoryStatusBreakdown?.active ?? 0,
                  },
                  {
                    label: "Inactive",
                    value: dashboard.categoryStatusBreakdown?.inactive ?? 0,
                  },
                ]}
              />
            </>
          ) : null}
        </div>
      )}

      {/* Store-wide state cards — only on /products page, same as homepage cards */}
      {isUserProductsPage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch pb-6">
          {productsPageCardsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <StatisticsCardSkeleton key={i} />
              ))}
            </>
          ) : productsPageStats ? (
            <>
              <StatisticsCard
                title="Total Products"
                value={productsPageStats.counts.products}
                description="Products availability"
                icon={Package}
                variant="rose"
                badges={[
                  {
                    label: "Available",
                    value:
                      productsPageStats.productStatusBreakdown?.available ?? 0,
                  },
                  {
                    label: "Stock low",
                    value:
                      productsPageStats.productStatusBreakdown?.stockLow ?? 0,
                  },
                  {
                    label: "Stock out",
                    value:
                      productsPageStats.productStatusBreakdown?.stockOut ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title="Total Value"
                value={formatCurrency(
                  productsPageStats.totalInventoryValue ?? 0,
                )}
                description="Total inventory value"
                icon={PhilippinePeso}
                variant="violet"
                badges={[
                  {
                    label: "Orders",
                    value: formatCurrency(
                      productsPageStats.orderAnalytics
                        ?.totalRevenueExcludingCancelled ??
                        productsPageStats.revenue?.fromOrders ??
                        0,
                    ),
                  },
                  {
                    label: "Invoices",
                    value: formatCurrency(
                      productsPageStats.revenue?.fromInvoices ?? 0,
                    ),
                  },
                  {
                    label: "Due",
                    value: formatCurrency(
                      productsPageStats.invoiceAnalytics?.outstandingAmount ??
                        0,
                    ),
                  },
                  {
                    label: "Cancelled",
                    value: formatCurrency(
                      productsPageStats.orderAnalytics?.cancelledOrderAmount ??
                        0,
                    ),
                  },
                ]}
                expandableSections={[
                  {
                    title: `Breakdown by supplier (${productsPageStats.supplierValues?.length ?? 0})`,
                    items:
                      productsPageStats.supplierValues?.map((sv) => ({
                        label: sv.supplierName,
                        value: formatCurrency(sv.value),
                      })) ?? [],
                  },
                  {
                    title: `Breakdown by category (${productsPageStats.categoryValues?.length ?? 0})`,
                    items:
                      productsPageStats.categoryValues?.map((cv) => ({
                        label: cv.categoryName,
                        value: formatCurrency(cv.value),
                      })) ?? [],
                  },
                ]}
              />
              <StatisticsCard
                title="Total Suppliers"
                value={productsPageStats.counts.suppliers}
                description="Suppliers"
                icon={Truck}
                variant="emerald"
                badges={[
                  {
                    label: "Active",
                    value:
                      productsPageStats.supplierStatusBreakdown?.active ?? 0,
                  },
                  {
                    label: "Inactive",
                    value:
                      productsPageStats.supplierStatusBreakdown?.inactive ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title="Categories"
                value={productsPageStats.counts.categories}
                description="Product categories"
                icon={FolderTree}
                variant="amber"
                badges={[
                  {
                    label: "Active",
                    value:
                      productsPageStats.categoryStatusBreakdown?.active ?? 0,
                  },
                  {
                    label: "Inactive",
                    value:
                      productsPageStats.categoryStatusBreakdown?.inactive ?? 0,
                  },
                ]}
              />
            </>
          ) : null}
        </div>
      )}

      {/* Filters and Actions - Always visible, only disabled during auth check */}
      <div className="pb-6 flex justify-center">
        <div className="w-full max-w-9xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <ProductFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            pagination={pagination}
            setPagination={setPagination}
            allProducts={allProducts}
            allCategories={allCategories}
            allSuppliers={allSuppliers}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedStatuses={selectedStatuses}
            setSelectedStatuses={setSelectedStatuses}
            selectedSuppliers={selectedSuppliers}
            setSelectedSuppliers={setSelectedSuppliers}
            userId={user?.id || ""}
          />

          {/* Bulk Delete Button */}
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
        </div>
      </div>
      {/* Product Table - Shows skeleton during auth check or data loading */}
      <ProductTable
        data={allProducts || []}
        columns={columns}
        userId={user?.id || ""}
        isLoading={showSkeleton}
        searchTerm={searchTerm}
        pagination={pagination}
        setPagination={setPagination}
        selectedCategory={selectedCategory}
        selectedStatuses={selectedStatuses}
        selectedSuppliers={selectedSuppliers}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
    </div>
  );
});

ProductList.displayName = "ProductList";

export default ProductList;
