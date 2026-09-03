/**
 * Repair Order query hooks
 * TanStack Query hooks for repair order data fetching and mutations
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { RepairOrder, CreateRepairOrderInput } from "@/types";

/**
 * Query keys for repair orders
 */
export const repairOrderKeys = {
  all: ["repair-orders"] as const,
  lists: () => [...repairOrderKeys.all, "list"] as const,
  detail: (id: string) => [...repairOrderKeys.all, "detail", id] as const,
};

/**
 * Fetch all repair orders
 * Query hook for getting the list of all repair orders
 */
export function useRepairOrders() {
  return useQuery({
    queryKey: repairOrderKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.repairOrders.getAll();
      return response.data;
    },
  });
}

/**
 * Fetch repair order by ID
 * Query hook for getting a single repair order
 *
 * @param repairOrderId - Repair Order ID
 */
export function useRepairOrder(repairOrderId: string) {
  return useQuery({
    queryKey: repairOrderKeys.detail(repairOrderId),
    queryFn: async () => {
      const response = await apiClient.repairOrders.getById(repairOrderId);
      return response.data;
    },
    enabled: !!repairOrderId,
  });
}

/**
 * Create repair order mutation
 * Mutation hook for creating a new repair order
 * Note: This does NOT affect product stock
 */
export function useCreateRepairOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateRepairOrderInput) => {
      const response = await apiClient.repairOrders.create(data);
      return response.data;
    },
    onSuccess: (data: RepairOrder) => {
      // Invalidate repair orders list
      queryClient.invalidateQueries({ queryKey: repairOrderKeys.lists() });

      toast({
        title: "Repair Order Created Successfully",
        description: `Repair order ${data.repairOrderNumber} has been created.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Repair Order Creation Failed",
        description:
          getErrorMessage(error) ||
          "Failed to create repair order. Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Delete repair order mutation
 * Mutation hook for deleting a repair order
 */
export function useDeleteRepairOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.repairOrders.delete(id);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repairOrderKeys.lists() });

      toast({
        title: "Repair Order Deleted Successfully",
        description: "The repair order has been deleted.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Repair Order Deletion Failed",
        description:
          getErrorMessage(error) ||
          "Failed to delete repair order. Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Bulk delete repair orders mutation
 * Mutation hook for deleting multiple repair orders at once
 */
export function useBulkDeleteRepairOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiClient.repairOrders.bulkDelete(ids);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: repairOrderKeys.lists() });

      toast({
        title: "Repair Orders Deleted Successfully",
        description: `${data.deletedCount} repair order(s) have been deleted.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Bulk Deletion Failed",
        description:
          getErrorMessage(error) ||
          "Failed to delete repair orders. Please try again.",
        variant: "destructive",
      });
    },
  });
}
