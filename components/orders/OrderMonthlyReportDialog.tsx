/**
 * Order Monthly Report Dialog Component
 * Generative report of all orders of product per month (orders page).
 * Groups order line items by product and by month, with chart, table, and export.
 */

"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Download, FileDown, FileSpreadsheet, Search, X } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types";

const formatCurrency = (value: number) =>
  `₱${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
}

interface ReportRow {
  monthKey: string;
  monthLabel: string;
  productId: string;
  productName: string;
  sku: string;
  quantityOrdered: number;
  orderCount: number;
  revenue: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelOf(key: string): string {
  const [year, month] = key.split("-");
  const idx = Number(month) - 1;
  return `${MONTH_LABELS[idx] ?? month} ${year}`;
}

function buildReport(orders: Order[]): { rows: ReportRow[]; months: string[] } {
  const byProductMonth = new Map<
    string,
    Map<
      string,
      {
        orderCount: number;
        quantityOrdered: number;
        revenue: number;
      }
    >
  >();
  const productMeta = new Map<
    string,
    { productName: string; sku: string }
  >();
  const monthSet = new Set<string>();

  for (const order of orders) {
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    if (!createdAt || isNaN(createdAt.getTime())) continue;
    const monthKey = monthKeyOf(createdAt);
    monthSet.add(monthKey);
    if (!Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const productId = item.productId || item.productName;
      if (!productMeta.has(productId)) {
        productMeta.set(productId, {
          productName: item.productName || "Unknown",
          sku: item.sku || "",
        });
      }
      let monthMap = byProductMonth.get(productId);
      if (!monthMap) {
        monthMap = new Map();
        byProductMonth.set(productId, monthMap);
      }
      const cur = monthMap.get(monthKey) || {
        orderCount: 0,
        quantityOrdered: 0,
        revenue: 0,
      };
      cur.orderCount += 1;
      cur.quantityOrdered += Number(item.quantity ?? 0);
      cur.revenue += Number(item.subtotal ?? 0);
      monthMap.set(monthKey, cur);
    }
  }

  const rows: ReportRow[] = [];
  for (const [productId, monthMap] of byProductMonth) {
    const meta = productMeta.get(productId) || {
      productName: "Unknown",
      sku: "",
    };
    for (const [monthKey, data] of monthMap) {
      rows.push({
        monthKey,
        monthLabel: monthLabelOf(monthKey),
        productId,
        productName: meta.productName,
        sku: meta.sku || "",
        quantityOrdered: data.quantityOrdered,
        orderCount: data.orderCount,
        revenue: data.revenue,
      });
    }
  }

  rows.sort(
    (a, b) =>
      b.monthKey.localeCompare(a.monthKey) ||
      a.productName.localeCompare(b.productName),
  );

  return {
    rows,
    months: Array.from(monthSet).sort((a, b) => b.localeCompare(a)),
  };
}

export function OrderMonthlyReportDialog({
  open,
  onOpenChange,
  orders,
}: Props) {
  const { toast } = useToast();
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const report = useMemo(() => buildReport(orders), [orders]);

  const filteredRows = useMemo(() => {
    return report.rows.filter((row) => {
      const matchesMonth =
        monthFilter === "all" || row.monthKey === monthFilter;
      const matchesSearch =
        !searchTerm ||
        row.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMonth && matchesSearch;
    });
  }, [report.rows, monthFilter, searchTerm]);

  const summary = useMemo(() => {
    const rowSet = new Map<string, ReportRow[]>();
    filteredRows.forEach((row) => {
      const arr = rowSet.get(row.monthKey) || [];
      arr.push(row);
      rowSet.set(row.monthKey, arr);
    });
    return {
      totalRows: filteredRows.length,
      totalQty: filteredRows.reduce((s, r) => s + r.quantityOrdered, 0),
      totalRevenue: filteredRows.reduce((s, r) => s + r.revenue, 0),
      totalOrders: filteredRows.reduce((s, r) => s + r.orderCount, 0),
      months: Array.from(rowSet.keys()).sort((a, b) => a.localeCompare(b)),
    };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const byMonthProduct = new Map<
      string,
      Map<string, number>
    >();
    for (const row of filteredRows) {
      if (!byMonthProduct.has(row.monthLabel)) {
        byMonthProduct.set(row.monthLabel, new Map());
      }
      byMonthProduct
        .get(row.monthLabel)!
        .set(row.productName, (byMonthProduct.get(row.monthLabel)!.get(row.productName) || 0) + row.quantityOrdered);
    }
    return Array.from(byMonthProduct.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, productQty]) => {
        const entry: Record<string, string | number> = { month };
        productQty.forEach((qty, product) => {
          entry[product] = qty;
        });
        return entry;
      });
  }, [filteredRows]);

  const productNames = useMemo(() => {
    const names: string[] = [];
    for (const row of filteredRows) {
      if (!names.includes(row.productName)) names.push(row.productName);
    }
    return names;
  }, [filteredRows]);

  const handleExportCSV = () => {
    try {
      if (filteredRows.length === 0) {
        toast({
          title: "No Data to Export",
          description: "There are no report rows to export with the current filters.",
          variant: "destructive",
        });
        return;
      }
      const csvData = filteredRows.map((row) => ({
        Month: row.monthLabel,
        Product: row.productName,
        SKU: row.sku || "-",
        "Quantity Ordered": row.quantityOrdered,
        "Orders Count": row.orderCount,
        Revenue: row.revenue.toFixed(2),
      }));
      const columns = [
        { header: "Month", key: "Month" },
        { header: "Product", key: "Product" },
        { header: "SKU", key: "SKU" },
        { header: "Quantity Ordered", key: "Quantity Ordered" },
        { header: "Orders Count", key: "Orders Count" },
        { header: "Revenue", key: "Revenue" },
      ];
      exportToCSV(csvData, columns, "stockly-monthly-order-report");
      toast({
        title: "CSV Export Successful!",
        description: `${filteredRows.length} rows exported to CSV file.`,
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Failed to export report to CSV. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      if (filteredRows.length === 0) {
        toast({
          title: "No Data to Export",
          description: "There are no report rows to export with the current filters.",
          variant: "destructive",
        });
        return;
      }
      const excelData = filteredRows.map((row) => ({
        Month: row.monthLabel,
        Product: row.productName,
        SKU: row.sku || "-",
        "Quantity Ordered": row.quantityOrdered,
        "Orders Count": row.orderCount,
        Revenue: row.revenue.toFixed(2),
      }));
      await exportToExcel({
        sheetName: "Monthly Order Report",
        fileName: "stockly-monthly-order-report",
        columns: [
          { header: "Month", key: "Month", width: 14 },
          { header: "Product", key: "Product", width: 30 },
          { header: "SKU", key: "SKU", width: 16 },
          { header: "Quantity Ordered", key: "Quantity Ordered", width: 16 },
          { header: "Orders Count", key: "Orders Count", width: 14 },
          { header: "Revenue", key: "Revenue", width: 16 },
        ],
        data: excelData,
      });
      toast({
        title: "Excel Export Successful!",
        description: `${filteredRows.length} rows exported to Excel file.`,
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Failed to export report to Excel. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto rounded-[28px] border border-violet-400/20 bg-white/95 dark:bg-popover/95 backdrop-blur-xl sm:rounded-[28px]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Download className="h-5 w-5 text-violet-500" />
            Orders of Products per Month
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-white/50 z-10" />
              <Input
                placeholder="Search product or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-9 pr-9 w-full rounded-[28px] bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-violet-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-500 dark:text-white/60"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-10 w-full sm:w-52 rounded-[28px] border border-violet-400/30 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-gray-900 dark:text-white">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {report.months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {monthLabelOf(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-1 justify-end items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredRows.length === 0}
                className="h-10 rounded-[28px] border border-violet-400/30 bg-gradient-to-r from-violet-500/25 to-violet-500/10 text-gray-700 dark:text-white hover:border-violet-300/40 disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={filteredRows.length === 0}
                className="h-10 rounded-[28px] border border-emerald-400/30 bg-gradient-to-r from-emerald-500/25 to-emerald-500/10 text-gray-700 dark:text-white hover:border-emerald-300/40 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-transparent p-3 text-center">
              <div className="text-xl font-semibold text-violet-600 dark:text-violet-400">
                {summary.totalRows}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/70">
                Product-Month Rows
              </div>
            </div>
            <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/15 to-transparent p-3 text-center">
              <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                {summary.totalQty.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/70">
                Units Ordered
              </div>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 to-transparent p-3 text-center">
              <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">
                {summary.totalOrders}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/70">
                Orders
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 to-transparent p-3 text-center">
              <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/70">
                Revenue
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="rounded-2xl border border-violet-400/20 bg-white/50 dark:bg-white/5 p-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">
                Units Ordered per Product per Month
              </h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888822" />
                  <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#888", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid #a78bfa55",
                      background: "#ffffffEE",
                    }}
                  />
                  <Legend />
                  {productNames.slice(0, 10).map((name, i) => (
                    <Bar
                      key={name}
                      dataKey={name}
                      stackId="a"
                      fill={
                        [
                          "#8b5cf6",
                          "#3b82f6",
                          "#10b981",
                          "#f59e0b",
                          "#ef4444",
                          "#06b6d4",
                          "#f97316",
                          "#ec4899",
                          "#84cc16",
                          "#6366f1",
                        ][i % 10]
                      }
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-violet-400/20">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-500/20 to-violet-500/5 text-left">
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85">Month</th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85">Product</th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85">SKU</th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">Qty Ordered</th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">Orders</th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-white/50">
                        No report data found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, i) => (
                      <tr
                        key={`${row.monthKey}-${row.productId}-${i}`}
                        className="border-t border-gray-200/60 dark:border-white/10"
                      >
                        <td className="px-4 py-2 text-gray-700 dark:text-white/80">
                          {row.monthLabel}
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-800 dark:text-white/90">
                          {row.productName}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-white/60">
                          {row.sku || "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700 dark:text-white/80">
                          {row.quantityOrdered.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700 dark:text-white/80">
                          {row.orderCount}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
