/**
 * Repair Order Report Dialog Component
 * Generates daily and weekly reports grouped by technician with materials detail
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
import {
  Download,
  FileDown,
  FileSpreadsheet,
  Calendar,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import type { RepairOrder } from "@/types";

const formatCurrency = (value: number) =>
  `₱${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairOrders: RepairOrder[];
}

interface MaterialDetail {
  productName: string;
  sku: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}

interface DailyReportRow {
  date: string;
  dateLabel: string;
  technicianName: string;
  warrantyStatus: "IN_WARRANTY" | "OUT_OF_WARRANTY";
  orderCount: number;
  totalQuantity: number;
  totalValue: number;
  materials: MaterialDetail[];
}

interface WeeklyReportRow {
  weekStart: string;
  weekLabel: string;
  technicianName: string;
  warrantyStatus: "IN_WARRANTY" | "OUT_OF_WARRANTY";
  orderCount: number;
  totalQuantity: number;
  totalValue: number;
  materials: MaterialDetail[];
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${weekStart.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

function mergeMaterials(
  existing: MaterialDetail[],
  items: RepairOrder["items"],
): MaterialDetail[] {
  const merged = [...existing];
  for (const item of items) {
    const found = merged.find((m) => m.productName === item.productName);
    if (found) {
      found.quantity += item.quantity;
      found.subtotal += item.subtotal;
    } else {
      merged.push({
        productName: item.productName,
        sku: item.sku ?? null,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      });
    }
  }
  return merged;
}

function buildDailyReport(
  repairOrders: RepairOrder[],
): { rows: DailyReportRow[]; dates: string[] } {
  const byDateTechnician = new Map<
    string,
    Map<string, DailyReportRow>
  >();
  const dateSet = new Set<string>();

  for (const order of repairOrders) {
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    if (!createdAt || isNaN(createdAt.getTime())) continue;

    const dateKey = formatDateKey(createdAt);
    dateSet.add(dateKey);

    if (!byDateTechnician.has(dateKey)) {
      byDateTechnician.set(dateKey, new Map());
    }
    const techMap = byDateTechnician.get(dateKey)!;

    const warrantyKey = order.warrantyStatus || "OUT_OF_WARRANTY";
    const groupKey = `${order.technicianName}:${warrantyKey}`;
    const existing = techMap.get(groupKey);

    if (existing) {
      existing.orderCount += 1;
      for (const item of order.items) {
        existing.totalQuantity += item.quantity;
        existing.totalValue += item.subtotal;
      }
      existing.materials = mergeMaterials(existing.materials, order.items);
    } else {
      let totalQuantity = 0;
      let totalValue = 0;
      for (const item of order.items) {
        totalQuantity += item.quantity;
        totalValue += item.subtotal;
      }
      techMap.set(groupKey, {
        date: dateKey,
        dateLabel: new Date(dateKey).toLocaleDateString(),
        technicianName: order.technicianName,
        warrantyStatus: warrantyKey,
        orderCount: 1,
        totalQuantity,
        totalValue,
        materials: mergeMaterials([], order.items),
      });
    }
  }

  const rows: DailyReportRow[] = [];
  for (const [, techMap] of byDateTechnician) {
    for (const [, data] of techMap) {
      rows.push(data);
    }
  }

  rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.technicianName.localeCompare(b.technicianName),
  );

  return {
    rows,
    dates: Array.from(dateSet).sort((a, b) => b.localeCompare(a)),
  };
}

function buildWeeklyReport(
  repairOrders: RepairOrder[],
): { rows: WeeklyReportRow[]; weeks: string[] } {
  const byWeekTechnician = new Map<
    string,
    Map<string, WeeklyReportRow>
  >();
  const weekSet = new Set<string>();

  for (const order of repairOrders) {
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    if (!createdAt || isNaN(createdAt.getTime())) continue;

    const weekStart = getWeekStart(createdAt);
    const weekKey = formatDateKey(weekStart);
    weekSet.add(weekKey);

    if (!byWeekTechnician.has(weekKey)) {
      byWeekTechnician.set(weekKey, new Map());
    }
    const techMap = byWeekTechnician.get(weekKey)!;

    const warrantyKey = order.warrantyStatus || "OUT_OF_WARRANTY";
    const groupKey = `${order.technicianName}:${warrantyKey}`;
    const existing = techMap.get(groupKey);
    if (existing) {
      existing.orderCount += 1;
      for (const item of order.items) {
        existing.totalQuantity += item.quantity;
        existing.totalValue += item.subtotal;
      }
      existing.materials = mergeMaterials(existing.materials, order.items);
    } else {
      let totalQuantity = 0;
      let totalValue = 0;
      for (const item of order.items) {
        totalQuantity += item.quantity;
        totalValue += item.subtotal;
      }
      techMap.set(groupKey, {
        weekStart: weekKey,
        weekLabel: formatWeekLabel(new Date(weekKey)),
        technicianName: order.technicianName,
        warrantyStatus: warrantyKey,
        orderCount: 1,
        totalQuantity,
        totalValue,
        materials: mergeMaterials([], order.items),
      });
    }
  }

  const rows: WeeklyReportRow[] = [];
  for (const [, techMap] of byWeekTechnician) {
    for (const [, data] of techMap) {
      rows.push(data);
    }
  }

  rows.sort(
    (a, b) =>
      b.weekStart.localeCompare(a.weekStart) ||
      a.technicianName.localeCompare(b.technicianName),
  );

  return {
    rows,
    weeks: Array.from(weekSet).sort((a, b) => b.localeCompare(a)),
  };
}

export function RepairOrderReportDialog({
  open,
  onOpenChange,
  repairOrders,
}: Props) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<"daily" | "weekly">("daily");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [warrantyFilter, setWarrantyFilter] = useState<"all" | "IN_WARRANTY" | "OUT_OF_WARRANTY">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const dailyReport = useMemo(
    () => buildDailyReport(repairOrders),
    [repairOrders],
  );
  const weeklyReport = useMemo(
    () => buildWeeklyReport(repairOrders),
    [repairOrders],
  );

  const filteredDailyRows = useMemo(() => {
    return dailyReport.rows.filter((row) => {
      const matchesDate = dateFilter === "all" || row.date === dateFilter;
      const matchesWarranty =
        warrantyFilter === "all" || row.warrantyStatus === warrantyFilter;
      const matchesSearch =
        !searchTerm ||
        row.technicianName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDate && matchesWarranty && matchesSearch;
    });
  }, [dailyReport.rows, dateFilter, searchTerm, warrantyFilter]);

  const filteredWeeklyRows = useMemo(() => {
    return weeklyReport.rows.filter((row) => {
      const matchesDate = dateFilter === "all" || row.weekStart === dateFilter;
      const matchesWarranty =
        warrantyFilter === "all" || row.warrantyStatus === warrantyFilter;
      const matchesSearch =
        !searchTerm ||
        row.technicianName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDate && matchesWarranty && matchesSearch;
    });
  }, [weeklyReport.rows, dateFilter, searchTerm, warrantyFilter]);

  const currentRows =
    reportType === "daily" ? filteredDailyRows : filteredWeeklyRows;

  const summary = useMemo(() => {
    const rows = currentRows;
    const allMaterials = new Map<string, { quantity: number; subtotal: number }>();
    for (const row of rows) {
      for (const mat of row.materials) {
        const existing = allMaterials.get(mat.productName);
        if (existing) {
          existing.quantity += mat.quantity;
          existing.subtotal += mat.subtotal;
        } else {
          allMaterials.set(mat.productName, {
            quantity: mat.quantity,
            subtotal: mat.subtotal,
          });
        }
      }
    }
    return {
      totalOrders: rows.reduce((s, r) => s + r.orderCount, 0),
      totalQuantity: rows.reduce((s, r) => s + r.totalQuantity, 0),
      totalValue: rows.reduce((s, r) => s + r.totalValue, 0),
      technicians: new Set(rows.map((r) => r.technicianName)).size,
      uniqueMaterials: allMaterials.size,
    };
  }, [currentRows]);

  // Chart data
  const chartData = useMemo(() => {
    const byGroupTech = new Map<string, Map<string, number>>();

    for (const row of currentRows) {
      const groupKey =
        reportType === "daily"
          ? (row as DailyReportRow).dateLabel
          : (row as WeeklyReportRow).weekLabel;
      if (!byGroupTech.has(groupKey)) {
        byGroupTech.set(groupKey, new Map());
      }
      byGroupTech
        .get(groupKey)!
        .set(
          row.technicianName,
          (byGroupTech.get(groupKey)!.get(row.technicianName) || 0) +
            row.totalValue,
        );
    }

    return Array.from(byGroupTech.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([group, techValues]) => {
        const entry: Record<string, string | number> = { name: group };
        techValues.forEach((value, tech) => {
          entry[tech] = value;
        });
        return entry;
      });
  }, [currentRows, reportType]);

  const technicianNames = useMemo(() => {
    const names: string[] = [];
    for (const row of currentRows) {
      if (!names.includes(row.technicianName)) names.push(row.technicianName);
    }
    return names;
  }, [currentRows]);

  const toggleRowExpand = (rowKey: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const getRowKey = (row: DailyReportRow | WeeklyReportRow, i: number) => {
    const datePart =
      reportType === "daily"
        ? (row as DailyReportRow).date
        : (row as WeeklyReportRow).weekStart;
    return `${datePart}-${row.technicianName}-${i}`;
  };

  const handleExportCSV = () => {
    try {
      if (currentRows.length === 0) {
        toast({
          title: "No Data to Export",
          description:
            "There are no report rows to export with the current filters.",
          variant: "destructive",
        });
        return;
      }

      const csvData: Array<Record<string, string | number>> = [];
      for (const row of currentRows) {
        const dateCol =
          reportType === "daily"
            ? (row as DailyReportRow).dateLabel
            : (row as WeeklyReportRow).weekLabel;
        if (row.materials.length === 0) {
          csvData.push({
            [reportType === "daily" ? "Date" : "Week"]: dateCol,
            Technician: row.technicianName,
            Warranty: row.warrantyStatus === "IN_WARRANTY" ? "In Warranty" : "Out of Warranty",
            Product: "—",
            SKU: "—",
            "Qty Used": 0,
            "Unit Price": 0,
            Subtotal: 0,
            "Total Orders": row.orderCount,
            "Total Value": row.totalValue,
          });
        } else {
          for (const mat of row.materials) {
            csvData.push({
              [reportType === "daily" ? "Date" : "Week"]: dateCol,
              Technician: row.technicianName,
              Warranty: row.warrantyStatus === "IN_WARRANTY" ? "In Warranty" : "Out of Warranty",
              Product: mat.productName,
              SKU: mat.sku || "—",
              "Qty Used": mat.quantity,
              "Unit Price": mat.price,
              Subtotal: mat.subtotal,
              "Total Orders": row.orderCount,
              "Total Value": row.totalValue,
            });
          }
        }
      }

      const columns = [
        {
          header: reportType === "daily" ? "Date" : "Week",
          key: reportType === "daily" ? "Date" : "Week",
        },
        { header: "Technician", key: "Technician" },
        { header: "Warranty", key: "Warranty" },
        { header: "Product", key: "Product" },
        { header: "SKU", key: "SKU" },
        { header: "Qty Used", key: "Qty Used" },
        { header: "Unit Price", key: "Unit Price" },
        { header: "Subtotal", key: "Subtotal" },
        { header: "Total Orders", key: "Total Orders" },
        { header: "Total Value", key: "Total Value" },
      ];

      exportToCSV(csvData, columns, `repair-order-${reportType}-report`);
      toast({
        title: "CSV Export Successful!",
        description: `${csvData.length} rows exported to CSV file.`,
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
      if (currentRows.length === 0) {
        toast({
          title: "No Data to Export",
          description:
            "There are no report rows to export with the current filters.",
          variant: "destructive",
        });
        return;
      }

      const excelData: Array<Record<string, string | number>> = [];
      for (const row of currentRows) {
        const dateCol =
          reportType === "daily"
            ? (row as DailyReportRow).dateLabel
            : (row as WeeklyReportRow).weekLabel;
        if (row.materials.length === 0) {
          excelData.push({
            [reportType === "daily" ? "Date" : "Week"]: dateCol,
            Technician: row.technicianName,
            Warranty: row.warrantyStatus === "IN_WARRANTY" ? "In Warranty" : "Out of Warranty",
            Product: "—",
            SKU: "—",
            "Qty Used": 0,
            "Unit Price": 0,
            Subtotal: 0,
            "Total Orders": row.orderCount,
            "Total Value": row.totalValue,
          });
        } else {
          for (const mat of row.materials) {
            excelData.push({
              [reportType === "daily" ? "Date" : "Week"]: dateCol,
              Technician: row.technicianName,
              Warranty: row.warrantyStatus === "IN_WARRANTY" ? "In Warranty" : "Out of Warranty",
              Product: mat.productName,
              SKU: mat.sku || "—",
              "Qty Used": mat.quantity,
              "Unit Price": mat.price,
              Subtotal: mat.subtotal,
              "Total Orders": row.orderCount,
              "Total Value": row.totalValue,
            });
          }
        }
      }

      await exportToExcel({
        sheetName: `Repair Orders ${reportType === "daily" ? "Daily" : "Weekly"} Report`,
        fileName: `repair-order-${reportType}-report`,
        columns: [
          {
            header: reportType === "daily" ? "Date" : "Week",
            key: reportType === "daily" ? "Date" : "Week",
            width: reportType === "daily" ? 14 : 30,
          },
          { header: "Technician", key: "Technician", width: 25 },
          { header: "Warranty", key: "Warranty", width: 20 },
          { header: "Product", key: "Product", width: 30 },
          { header: "SKU", key: "SKU", width: 16 },
          { header: "Qty Used", key: "Qty Used", width: 12 },
          { header: "Unit Price", key: "Unit Price", width: 14 },
          { header: "Subtotal", key: "Subtotal", width: 14 },
          { header: "Total Orders", key: "Total Orders", width: 14 },
          { header: "Total Value", key: "Total Value", width: 14 },
        ],
        data: excelData,
      });

      toast({
        title: "Excel Export Successful!",
        description: `${excelData.length} rows exported to Excel file.`,
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
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto rounded-[28px] border border-violet-400/20 bg-white/95 dark:bg-popover/95 backdrop-blur-xl sm:rounded-[28px]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-violet-500" />
            Repair Orders Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Report Type Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={reportType === "daily" ? "default" : "outline"}
                onClick={() => {
                  setReportType("daily");
                  setDateFilter("all");
                  setExpandedRows(new Set());
                }}
                className="h-10 rounded-[28px]"
              >
                Daily
              </Button>
              <Button
                variant={reportType === "weekly" ? "default" : "outline"}
                onClick={() => {
                  setReportType("weekly");
                  setDateFilter("all");
                  setExpandedRows(new Set());
                }}
                className="h-10 rounded-[28px]"
              >
                Weekly
              </Button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:max-w-md">
              <Input
                placeholder="Search technician..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-3 pr-9 w-full rounded-[28px] bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-violet-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40"
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

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-10 w-full sm:w-52 rounded-[28px] border border-violet-400/30 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-gray-900 dark:text-white">
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All {reportType === "daily" ? "Days" : "Weeks"}
                </SelectItem>
                {(
                  reportType === "daily"
                    ? dailyReport.dates
                    : weeklyReport.weeks
                ).map((d) => (
                  <SelectItem key={d} value={d}>
                    {reportType === "daily"
                      ? new Date(d).toLocaleDateString()
                      : formatWeekLabel(new Date(d))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={warrantyFilter}
              onValueChange={(value) => setWarrantyFilter(value as "all" | "IN_WARRANTY" | "OUT_OF_WARRANTY")}
            >
              <SelectTrigger className="h-10 w-full sm:w-52 rounded-[28px] border border-violet-400/30 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-gray-900 dark:text-white">
                <SelectValue placeholder="All warranty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warranty</SelectItem>
                <SelectItem value="IN_WARRANTY">In Warranty</SelectItem>
                <SelectItem value="OUT_OF_WARRANTY">Out of Warranty</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Buttons */}
            <div className="flex flex-1 justify-end items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={currentRows.length === 0}
                className="h-10 rounded-[28px] border border-violet-400/30 bg-gradient-to-r from-violet-500/25 to-violet-500/10 text-gray-700 dark:text-white hover:border-violet-300/40 disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={currentRows.length === 0}
                className="h-10 rounded-[28px] border border-emerald-400/30 bg-gradient-to-r from-emerald-500/25 to-emerald-500/10 text-gray-700 dark:text-white hover:border-emerald-300/40 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-transparent p-3 text-center">
              <div className="text-xl font-semibold text-violet-600 dark:text-violet-400">
                {summary.totalOrders}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/70">
                Total Orders
              </div>
            </div>
            <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/15 to-transparent p-3 text-center">
              <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                {summary.totalQuantity.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/70">
                Total Materials Qty
              </div>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 to-transparent p-3 text-center">
              <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">
                {summary.technicians}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/70">
                Technicians
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 to-transparent p-3 text-center">
              <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.totalValue)}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/70">
                Total Value
              </div>
            </div>
            <div className="rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/15 to-transparent p-3 text-center">
              <div className="text-xl font-semibold text-rose-600 dark:text-rose-400">
                {summary.uniqueMaterials}
              </div>
              <div className="text-xs text-gray-600 dark:text-white/70">
                Unique Materials
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="rounded-2xl border border-violet-400/20 bg-white/50 dark:bg-white/5 p-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">
                Materials Value by Technician (
                {reportType === "daily" ? "Daily" : "Weekly"})
              </h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888822" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#888", fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: "#888", fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid #a78bfa55",
                      background: "#ffffffEE",
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend />
                  {technicianNames.slice(0, 10).map((name, i) => (
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

          {/* Table with Expandable Rows */}
          <div className="overflow-hidden rounded-2xl border border-violet-400/20">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-500/20 to-violet-500/5 text-left">
                    <th className="px-4 py-2 w-8"></th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85">
                      {reportType === "daily" ? "Date" : "Week"}
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85">
                      Technician
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85">
                      Warranty
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">
                      Orders
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">
                      Qty Used
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">
                      Materials
                    </th>
                    <th className="px-4 py-2 font-medium text-gray-700 dark:text-white/85 text-right">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-gray-500 dark:text-white/50"
                      >
                        No report data found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((row, i) => {
                      const rowKey = getRowKey(row, i);
                      const isExpanded = expandedRows.has(rowKey);
                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            className="border-t border-gray-200/60 dark:border-white/10 hover:bg-violet-500/5 dark:hover:bg-violet-500/10 cursor-pointer transition-colors"
                            onClick={() => toggleRowExpand(rowKey)}
                          >
                            <td className="px-4 py-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-violet-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-white/80">
                              {reportType === "daily"
                                ? (row as DailyReportRow).dateLabel
                                : (row as WeeklyReportRow).weekLabel}
                            </td>
                            <td className="px-4 py-2 font-medium text-gray-800 dark:text-white/90">
                              {row.technicianName}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-white/80">
                              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${row.warrantyStatus === "IN_WARRANTY" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                                {row.warrantyStatus === "IN_WARRANTY" ? "In Warranty" : "Out of Warranty"}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-gray-700 dark:text-white/80">
                              {row.orderCount}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-700 dark:text-white/80">
                              {row.totalQuantity.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-700 dark:text-white/80">
                              {row.materials.length} type
                              {row.materials.length !== 1 ? "s" : ""}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.totalValue)}
                            </td>
                          </tr>
                          {/* Expanded Materials Sub-Table */}
                          {isExpanded && row.materials.length > 0 && (
                            <tr className="bg-violet-500/5 dark:bg-violet-500/10">
                              <td colSpan={8} className="px-4 py-3">
                                <div className="ml-8 rounded-xl border border-violet-400/15 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-gradient-to-r from-violet-500/10 to-transparent">
                                        <th className="px-3 py-1.5 text-left font-medium text-gray-600 dark:text-white/70">
                                          Product
                                        </th>
                                        <th className="px-3 py-1.5 text-left font-medium text-gray-600 dark:text-white/70">
                                          SKU
                                        </th>
                                        <th className="px-3 py-1.5 text-right font-medium text-gray-600 dark:text-white/70">
                                          Qty
                                        </th>
                                        <th className="px-3 py-1.5 text-right font-medium text-gray-600 dark:text-white/70">
                                          Unit Price
                                        </th>
                                        <th className="px-3 py-1.5 text-right font-medium text-gray-600 dark:text-white/70">
                                          Subtotal
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.materials.map((mat, mi) => (
                                        <tr
                                          key={mi}
                                          className="border-t border-violet-400/10"
                                        >
                                          <td className="px-3 py-1.5 font-medium text-gray-800 dark:text-white/90">
                                            {mat.productName}
                                          </td>
                                          <td className="px-3 py-1.5 text-gray-600 dark:text-white/60">
                                            {mat.sku || "—"}
                                          </td>
                                          <td className="px-3 py-1.5 text-right text-gray-700 dark:text-white/80">
                                            {mat.quantity}
                                          </td>
                                          <td className="px-3 py-1.5 text-right text-gray-700 dark:text-white/80">
                                            {formatCurrency(mat.price)}
                                          </td>
                                          <td className="px-3 py-1.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(mat.subtotal)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                          {isExpanded && row.materials.length === 0 && (
                            <tr className="bg-violet-500/5 dark:bg-violet-500/10">
                              <td
                                colSpan={7}
                                className="px-4 py-3 text-center text-gray-500 dark:text-white/50 text-xs"
                              >
                                No materials recorded for this entry.
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
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
