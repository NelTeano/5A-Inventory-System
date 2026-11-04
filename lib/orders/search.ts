import type { Order } from "@/types";

export function matchesOrderSearch(order: Order, searchTerm: string): boolean {
  if (!searchTerm) return true;

  const query = searchTerm.toLowerCase();
  return (
    order.orderNumber.toLowerCase().includes(query) ||
    (order.notes?.toLowerCase().includes(query) ?? false) ||
    order.items.some(
      (item) =>
        item.productName.toLowerCase().includes(query) ||
        (item.sku?.toLowerCase().includes(query) ?? false),
    )
  );
}
