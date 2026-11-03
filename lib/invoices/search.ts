import type { Invoice } from "@/types";

export function matchesInvoiceSearch(invoice: Invoice, searchTerm: string): boolean {
  if (!searchTerm) return true;

  const query = searchTerm.toLowerCase();
  return (
    invoice.invoiceNumber.toLowerCase().includes(query) ||
    (invoice.notes?.toLowerCase().includes(query) ?? false) ||
    (invoice.orderItems?.some(
      (item) =>
        item.productName.toLowerCase().includes(query) ||
        (item.sku?.toLowerCase().includes(query) ?? false),
    ) ??
      false)
  );
}
