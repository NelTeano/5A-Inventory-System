/**
 * Repair Order Dialog Component
 * For creating new repair orders
 * Note: Repair orders do NOT affect product stock
 */

"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, FormProvider, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateRepairOrder, useProducts } from "@/hooks/queries";
import { Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Validation schema for repair order
const repairOrderSchema = z.object({
  technicianName: z.string().min(1, "Technician name is required"),
  customerName: z.string().min(1, "Customer name is required"),
  warrantyStatus: z.enum(["IN_WARRANTY", "OUT_OF_WARRANTY"]),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.number().int().min(0, "Quantity cannot be negative"),
      }),
    )
    .min(1, "At least one material is required"),
  notes: z.string().optional(),
});

type RepairOrderFormData = z.infer<typeof repairOrderSchema>;

interface RepairOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepairOrderDialog({
  open,
  onOpenChange,
}: RepairOrderDialogProps) {
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const { toast } = useToast();

  // Fetch products for selection
  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
  } = useProducts();

  // Repair orders can record any product, including materials with no stock.
  const availableProducts = products;

  // Create repair order mutation
  const createRepairOrderMutation = useCreateRepairOrder();
  const isSubmitting = createRepairOrderMutation.isPending;

  // Initialize form
  const formMethods = useForm<RepairOrderFormData>({
    resolver: zodResolver(repairOrderSchema),
    defaultValues: {
      technicianName: "",
      customerName: "",
      warrantyStatus: "OUT_OF_WARRANTY",
      items: [{ productId: "", quantity: 1 }],
      notes: "",
    },
  });

  const {
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = formMethods;

  // Use field array for dynamic items
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Watch form values for calculations
  const watchedItems = useWatch({ control, name: "items" }) || [];

  // Calculate subtotal from items
  const subtotal = useMemo(() => {
    if (!watchedItems || watchedItems.length === 0) return 0;
    return watchedItems.reduce((sum, item) => {
      if (!item?.productId) return sum;
      const itemQuantity =
        item.quantity !== undefined && item.quantity !== null
          ? Number(item.quantity)
          : 0;
      if (itemQuantity <= 0) return sum;
      const product = availableProducts.find(
        (p: { id: string }) => p.id === item.productId,
      );
      if (!product) return sum;
      const itemPrice = Number((product as { price: number }).price) || 0;
      return sum + itemPrice * itemQuantity;
    }, 0);
  }, [watchedItems, availableProducts]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset({
        technicianName: "",
        customerName: "",
        warrantyStatus: "OUT_OF_WARRANTY",
        items: [{ productId: "", quantity: 1 }],
        notes: "",
      });
    }
  }, [open, reset]);

  // Handle form submission
  const handleSubmit = async (data: RepairOrderFormData) => {
    try {
      // Validate items
      const validItems = data.items.filter((item) => {
        if (!item.productId) return false;
        return item.quantity >= 0;
      });

      if (validItems.length === 0) {
        throw new Error("At least one material is required");
      }

      // Create repair order
      await createRepairOrderMutation.mutateAsync({
        technicianName: data.technicianName,
        customerName: data.customerName,
        warrantyStatus: data.warrantyStatus,
        items: validItems,
        notes: data.notes,
      });

      // Close dialog on success
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by the mutation hook
      console.error("Repair order creation error:", error);
    }
  };

  // Add new item
  const handleAddItem = () => {
    append({ productId: "", quantity: 1 });
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div style={{ display: "none" }} />
      </DialogTrigger>
      <DialogContent
        className="p-4 sm:p-7 sm:px-8 poppins max-h-[90vh] overflow-y-auto border-violet-400/30 dark:border-violet-400/30 shadow-[0_30px_80px_rgba(139,92,246,0.45)] dark:shadow-[0_30px_80px_rgba(139,92,246,0.25)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[22px] text-white">
            Create New Repair Order
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Record materials used in a repair. This will not affect product
            inventory.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(handleSubmit)}>
            <div className="space-y-6">
              {/* Technician and Customer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-white/80 text-sm font-medium">
                    Technician Name *
                  </Label>
                  <Input
                    {...formMethods.register("technicianName")}
                    placeholder="Enter technician name"
                    className="h-11 border-violet-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-violet-400 focus-visible:border-violet-400 focus:ring-violet-500/50 focus-visible:ring-violet-500/50 shadow-[0_10px_30px_rgba(139,92,246,0.15)]"
                  />
                  {errors.technicianName && (
                    <p className="text-red-500 text-xs">
                      {errors.technicianName.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-white/80 text-sm font-medium">
                    Customer Name *
                  </Label>
                  <Input
                    {...formMethods.register("customerName")}
                    placeholder="Enter customer name"
                    className="h-11 border-violet-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-violet-400 focus-visible:border-violet-400 focus:ring-violet-500/50 focus-visible:ring-violet-500/50 shadow-[0_10px_30px_rgba(139,92,246,0.15)]"
                  />
                  {errors.customerName && (
                    <p className="text-red-500 text-xs">
                      {errors.customerName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-white/80 text-sm font-medium">
                  Warranty Status *
                </Label>
                <Select
                  value={watch("warrantyStatus")}
                  onValueChange={(value) =>
                    setValue("warrantyStatus", value as "IN_WARRANTY" | "OUT_OF_WARRANTY")
                  }
                >
                  <SelectTrigger className="h-11 border-violet-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-violet-400 focus-visible:border-violet-400 focus:ring-violet-500/50 focus-visible:ring-violet-500/50 shadow-[0_10px_30px_rgba(139,92,246,0.15)]">
                    <SelectValue placeholder="Select warranty status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_WARRANTY">In Warranty</SelectItem>
                    <SelectItem value="OUT_OF_WARRANTY">Out of Warranty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Materials Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-white/80 text-base font-semibold">
                    Materials Used
                  </Label>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    variant="secondary"
                    className="h-10 rounded-[28px] border border-violet-400/30 dark:border-violet-400/30 bg-gradient-to-r from-violet-500/30 via-violet-500/15 to-violet-500/5 dark:from-violet-500/30 dark:via-violet-500/15 dark:to-violet-500/5 text-gray-700 dark:text-white shadow-[0_10px_30px_rgba(139,92,246,0.2)] backdrop-blur-sm transition duration-200 hover:border-violet-300/60 hover:from-violet-500/35 hover:via-violet-500/25 hover:to-violet-500/15 dark:hover:border-violet-300/60 dark:hover:from-violet-500/35 dark:hover:via-violet-500/25 dark:hover:to-violet-500/15"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Material
                  </Button>
                </div>

                {fields.map((field, index) => {
                  const productId = watch(`items.${index}.productId`);
                  const quantityValue = watch(`items.${index}.quantity`);
                  const quantity =
                    quantityValue !== undefined && quantityValue !== null
                      ? Number(quantityValue)
                      : 0;
                  const selectedProduct = availableProducts.find(
                    (p: { id: string }) => p.id === productId,
                  );
                  const itemSubtotal =
                    selectedProduct && quantity > 0
                      ? Number((selectedProduct as { price: number }).price) *
                        quantity
                      : 0;

                  return (
                    <div
                      key={field.id}
                      className="p-4 border border-violet-400/20 rounded-lg bg-white/5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Product Selection */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-white/80 text-sm">
                              Material {index + 1}
                            </Label>
                            <Select
                              value={productId || undefined}
                              disabled={productsLoading || productsError}
                              onValueChange={(value) => {
                                setValue(
                                  `items.${index}.productId`,
                                  value,
                                  { shouldValidate: true },
                                );
                                setValue(`items.${index}.quantity`, 1);
                              }}
                            >
                              <SelectTrigger className="h-11 w-full border-violet-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 text-white">
                                <SelectValue
                                  placeholder={
                                    productsLoading
                                      ? "Loading materials..."
                                      : productsError
                                        ? "Unable to load materials"
                                        : "Select Material"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProducts.length > 0 ? (
                                  availableProducts.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id}
                                    >
                                      {product.sku} - {product.name} (Stock: {product.quantity})
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-materials" disabled>
                                    {productsError
                                      ? "Unable to load materials"
                                      : "No materials found"}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            {errors.items?.[index]?.productId && (
                              <p className="text-red-500 text-xs">
                                {String(
                                  errors.items[index]?.productId?.message,
                                )}
                              </p>
                            )}
                          </div>

                          {/* Quantity */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-white/80 text-sm">
                              Quantity
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={
                                quantityValue !== undefined &&
                                quantityValue !== null
                                  ? quantityValue === 0 || Number.isNaN(quantityValue)
                                    ? ""
                                    : quantityValue.toString()
                                  : ""
                              }
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                if (
                                  inputValue === "" ||
                                  inputValue === null ||
                                  inputValue === undefined
                                ) {
                                  setValue(`items.${index}.quantity`, 0, {
                                    shouldValidate: true,
                                  });
                                } else {
                                  const parsedValue = parseInt(inputValue, 10);
                                  if (!isNaN(parsedValue) && parsedValue > 0) {
                                    setValue(
                                      `items.${index}.quantity`,
                                      parsedValue,
                                      { shouldValidate: true },
                                    );
                                  } else {
                                    setValue(`items.${index}.quantity`, 0, {
                                      shouldValidate: true,
                                    });
                                  }
                                }
                              }}
                              placeholder="Enter quantity"
                              className="h-11 border-violet-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-violet-400 focus-visible:border-violet-400 focus:ring-violet-500/50 focus-visible:ring-violet-500/50 shadow-[0_10px_30px_rgba(139,92,246,0.15)]"
                            />
                            {errors.items?.[index]?.quantity && (
                              <p className="text-red-500 text-xs">
                                {String(
                                  errors.items[index]?.quantity?.message,
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Remove Button */}
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Item Subtotal */}
                      {selectedProduct && (
                        <div className="text-sm text-white/70">
                          Subtotal: ₱{itemSubtotal.toFixed(2)} (
                          {(selectedProduct as { name: string }).name} ×{" "}
                          {quantity || 0})
                        </div>
                      )}
                    </div>
                  );
                })}

                {errors.items &&
                  typeof errors.items === "object" &&
                  "message" in errors.items && (
                    <p className="text-red-500 text-xs">
                      {String(errors.items.message)}
                    </p>
                  )}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-2">
                <Label className="text-white/80 text-sm font-medium">
                  Notes (Optional)
                </Label>
                <textarea
                  {...formMethods.register("notes")}
                  placeholder="Enter repair notes..."
                  rows={3}
                  className="w-full rounded-md border border-violet-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-violet-400 focus:ring-violet-500/50 shadow-[0_10px_30px_rgba(139,92,246,0.15)] resize-none"
                />
              </div>

              {/* Total */}
              <div className="flex justify-end p-4 border border-violet-400/20 rounded-lg bg-white/5">
                <div className="text-right">
                  <p className="text-sm text-white/70">Total Materials Cost</p>
                  <p className="text-2xl font-semibold text-emerald-500">
                    ₱{subtotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 mb-2 flex flex-col sm:flex-row items-center gap-4">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                variant="secondary"
                className="h-11 w-full sm:w-auto px-11 inline-flex items-center justify-center rounded-xl border border-white/10 bg-gradient-to-r from-gray-400/40 via-gray-300/30 to-gray-400/40 dark:bg-background/50 backdrop-blur-sm shadow-[0_15px_35px_rgba(0,0,0,0.3)] dark:shadow-[0_15px_35px_rgba(255,255,255,0.25)] transition duration-200 hover:bg-gradient-to-r hover:from-gray-400/60 hover:via-gray-300/50 hover:to-gray-400/60 dark:hover:bg-accent/50 hover:border-white/20 dark:hover:border-white/20 hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_20px_45px_rgba(255,255,255,0.4)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 w-full sm:w-auto px-11 inline-flex items-center justify-center rounded-xl border border-violet-400/30 dark:border-violet-400/30 bg-gradient-to-r from-violet-500/70 via-violet-500/50 to-violet-500/30 dark:from-violet-500/70 dark:via-violet-500/50 dark:to-violet-500/30 text-white shadow-[0_15px_35px_rgba(139,92,246,0.45)] backdrop-blur-sm transition duration-200 hover:border-violet-300/40 hover:from-violet-500/80 hover:via-violet-500/60 hover:to-violet-500/40 dark:hover:border-violet-300/40 dark:hover:from-violet-500/80 dark:hover:via-violet-500/60 dark:hover:to-violet-500/40 hover:shadow-[0_20px_45px_rgba(139,92,246,0.6)]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Repair Order"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
